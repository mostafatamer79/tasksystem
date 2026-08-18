import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PlanStatus } from '@prisma/client';
import { PlanRepository } from './plan.repository';
import { PlanStateMachine } from './plan-state-machine';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import {
  QueryPlansDto,
  CreatePlanDto,
  UpdatePlanDto,
  CreatePlanTaskDto,
  UpdatePlanTaskDto,
  UpsertPlanTaskDto,
  ReturnPlanDto,
} from './dto/plan.dto';

@Injectable()
export class PlansService {
  constructor(
    private readonly repository: PlanRepository,
    private readonly stateMachine: PlanStateMachine,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: QueryPlansDto, actor: AuthUser) {
    return this.repository.findAll(query, actor);
  }

  async findOne(id: string, actor: AuthUser) {
    const plan = await this.repository.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');

    if (actor.role === 'EMPLOYEE' && plan.status !== 'PUBLISHED') {
      throw new ForbiddenException('Employees can only view published plans');
    }

    return plan;
  }

  async create(dto: CreatePlanDto, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can create plans');
    }

    const { tasks = [], ...planData } = dto;
    const plan = await this.repository.create(
      {
        ...planData,
        createdById: actor.id,
        status: PlanStatus.DRAFT,
      },
      tasks,
    );

    this.audit.log({
      userId: actor.id,
      action: 'PLAN_CREATE',
      entity: 'Plan',
      entityId: plan.id,
    });

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update plans');
    }

    const plan = await this.findOne(id, actor);
    if (plan.status !== PlanStatus.DRAFT && plan.status !== PlanStatus.RETURNED) {
      throw new BadRequestException('Can only update plans in DRAFT or RETURNED status');
    }

    const updated = await this.repository.update(id, { ...dto, returnNote: null });
    this.audit.log({ userId: actor.id, action: 'PLAN_UPDATE', entity: 'Plan', entityId: id });
    return updated;
  }

  async upsertTasks(id: string, tasks: UpsertPlanTaskDto[], actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can edit plan tasks');
    }

    const plan = await this.findOne(id, actor);
    if (plan.status !== PlanStatus.DRAFT && plan.status !== PlanStatus.RETURNED) {
      throw new BadRequestException('Can only edit tasks for plans in DRAFT or RETURNED status');
    }

    const updatedTasks = await this.repository.upsertTasks(id, tasks);
    this.audit.log({ userId: actor.id, action: 'PLAN_TASKS_UPSERT', entity: 'Plan', entityId: id });
    return updatedTasks;
  }

  async addTask(id: string, dto: CreatePlanTaskDto, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can add plan tasks');
    }
    const plan = await this.findOne(id, actor);
    if (plan.status !== PlanStatus.DRAFT && plan.status !== PlanStatus.RETURNED) {
      throw new BadRequestException('Can only add tasks to plans in DRAFT or RETURNED status');
    }
    return this.repository.addTask(id, dto);
  }

  async updateTask(planId: string, taskId: string, dto: UpdatePlanTaskDto, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update plan tasks');
    }
    const plan = await this.findOne(planId, actor);
    if (plan.status !== PlanStatus.DRAFT && plan.status !== PlanStatus.RETURNED) {
      throw new BadRequestException('Can only update tasks in DRAFT or RETURNED status');
    }
    return this.repository.updateTask(taskId, dto);
  }

  async removeTask(planId: string, taskId: string, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete plan tasks');
    }
    const plan = await this.findOne(planId, actor);
    if (plan.status !== PlanStatus.DRAFT && plan.status !== PlanStatus.RETURNED) {
      throw new BadRequestException('Can only delete tasks in DRAFT or RETURNED status');
    }
    return this.repository.removeTask(taskId);
  }

  async submit(id: string, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can submit plans');
    }
    const plan = await this.findOne(id, actor);
    this.stateMachine.validateTransition(actor.role, plan.status, PlanStatus.SUBMITTED);
    
    const updated = await this.repository.update(id, {
      status: PlanStatus.SUBMITTED,
      submittedAt: new Date(),
    });
    this.audit.log({ userId: actor.id, action: 'PLAN_SUBMIT', entity: 'Plan', entityId: id });
    return updated;
  }

  async publish(id: string, actor: AuthUser) {
    if (actor.role !== 'MODERATOR') {
      throw new ForbiddenException('Only moderators can publish plans');
    }
    const plan = await this.findOne(id, actor);
    this.stateMachine.validateTransition(actor.role, plan.status, PlanStatus.PUBLISHED);

    const updated = await this.repository.update(id, {
      status: PlanStatus.PUBLISHED,
      publishedAt: new Date(),
      reviewedById: actor.id,
    });
    this.audit.log({ userId: actor.id, action: 'PLAN_PUBLISH', entity: 'Plan', entityId: id });
    return updated;
  }

  async returnPlan(id: string, dto: ReturnPlanDto, actor: AuthUser) {
    if (actor.role !== 'MODERATOR') {
      throw new ForbiddenException('Only moderators can return plans');
    }
    const plan = await this.findOne(id, actor);
    this.stateMachine.validateTransition(actor.role, plan.status, PlanStatus.RETURNED);

    const updated = await this.repository.update(id, {
      status: PlanStatus.RETURNED,
      returnNote: dto.note,
      reviewedById: actor.id,
    });
    this.audit.log({ userId: actor.id, action: 'PLAN_RETURN', entity: 'Plan', entityId: id });
    return updated;
  }

  async remove(id: string, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete plans');
    }
    const plan = await this.findOne(id, actor);
    // Allow admins to delete the plan at any status
    await this.repository.remove(id);
    this.audit.log({ userId: actor.id, action: 'PLAN_DELETE', entity: 'Plan', entityId: id });
  }
}
