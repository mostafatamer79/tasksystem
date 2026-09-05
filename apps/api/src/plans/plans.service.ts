import { WorkflowService } from '../workflow/workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PlanStatus, Priority, TaskStatus, Prisma, Role, PlanTask } from '@prisma/client';
import { PlanRepository, planInclude } from './plan.repository';
import { PlanStateMachine } from './plan-state-machine';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { BalancedAssignmentStrategy } from '../tasks/strategies/balanced.strategy';
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
    private readonly workflow: WorkflowService,
    private readonly prisma: PrismaService,
    private readonly balancedAssignment: BalancedAssignmentStrategy,
  ) {}

  private isTaskEditableStatus(status: PlanStatus): boolean {
    return status === PlanStatus.DRAFT || status === PlanStatus.RETURNED || status === PlanStatus.PUBLISHED;
  }

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
    if (!this.isTaskEditableStatus(plan.status)) {
      throw new BadRequestException('Can only edit tasks for plans in DRAFT, RETURNED, or PUBLISHED status');
    }

    const updatedTasks = await this.prisma.$transaction(async (tx) => {
      const upserted = await this.repository.upsertTasksInTx(tx, id, tasks);

      for (const t of upserted) {
        if (t.taskId) continue;

        if (plan.status === PlanStatus.PUBLISHED) {
          const newTaskId = await this.createTaskFromPlanTask(tx, t, actor.id);
          if (newTaskId) {
            await tx.planTask.update({ where: { id: t.id }, data: { taskId: newTaskId } });
          }
        } else if (t.isReady && t.isAutomated) {
          const newTaskId = await this.workflow.handlePlanTaskReady(tx, t, actor.id);
          if (newTaskId) {
            await tx.planTask.update({ where: { id: t.id }, data: { taskId: newTaskId } });
          }
        }
      }

      return upserted;
    });

    this.audit.log({ userId: actor.id, action: 'PLAN_TASKS_UPSERT', entity: 'Plan', entityId: id });

    return updatedTasks;
  }

  async addTask(id: string, dto: CreatePlanTaskDto, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can add plan tasks');
    }
    const plan = await this.findOne(id, actor);
    if (!this.isTaskEditableStatus(plan.status)) {
      throw new BadRequestException('Can only add tasks to plans in DRAFT, RETURNED, or PUBLISHED status');
    }

    return this.prisma.$transaction(async (tx) => {
      const planTask = await this.repository.addTaskInTx(tx, id, dto);

      if (plan.status === PlanStatus.PUBLISHED && !planTask.taskId) {
        const newTaskId = await this.createTaskFromPlanTask(tx, planTask, actor.id);
        if (newTaskId) {
          await tx.planTask.update({ where: { id: planTask.id }, data: { taskId: newTaskId } });
        }
      }

      return planTask;
    });
  }

  async updateTask(planId: string, taskId: string, dto: UpdatePlanTaskDto, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update plan tasks');
    }
    const plan = await this.findOne(planId, actor);
    if (!this.isTaskEditableStatus(plan.status)) {
      throw new BadRequestException('Can only update tasks in DRAFT, RETURNED, or PUBLISHED status');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await this.repository.updateTaskInTx(tx, taskId, dto);
      if (updatedTask.taskId) return updatedTask;

      if (plan.status === PlanStatus.PUBLISHED) {
        const newTaskId = await this.createTaskFromPlanTask(tx, updatedTask, actor.id);
        if (newTaskId) {
          await tx.planTask.update({ where: { id: updatedTask.id }, data: { taskId: newTaskId } });
        }
      } else if (updatedTask.isReady && updatedTask.isAutomated) {
        const newTaskId = await this.workflow.handlePlanTaskReady(tx, updatedTask, actor.id);
        if (newTaskId) {
          await tx.planTask.update({ where: { id: updatedTask.id }, data: { taskId: newTaskId } });
        }
      }
      return updatedTask;
    });

  }

  async removeTask(planId: string, taskId: string, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete plan tasks');
    }
    const plan = await this.findOne(planId, actor);
    if (!this.isTaskEditableStatus(plan.status)) {
      throw new BadRequestException('Can only delete tasks in DRAFT, RETURNED, or PUBLISHED status');
    }
    const deleted = await this.prisma.planTask.deleteMany({ where: { id: taskId, planId } });
    if (deleted.count === 0) throw new NotFoundException('Plan task not found');
    this.audit.log({ userId: actor.id, action: 'PLAN_TASK_REMOVE', entity: 'PlanTask', entityId: taskId });
  }

  async removeAllTasks(id: string, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete plan tasks');
    }
    const plan = await this.findOne(id, actor);
    if (!this.isTaskEditableStatus(plan.status)) {
      throw new BadRequestException('Can only delete tasks in DRAFT, RETURNED, or PUBLISHED status');
    }

    const deleted = await this.prisma.planTask.deleteMany({ where: { planId: id } });
    this.audit.log({
      userId: actor.id,
      action: 'PLAN_TASKS_REMOVE_ALL',
      entity: 'Plan',
      entityId: id,
      metadata: { deletedCount: deleted.count },
    });
    return { deletedCount: deleted.count };
  }

  async removeTaskAndLinkedTask(planId: string, taskId: string, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete plan tasks');
    }
    const plan = await this.findOne(planId, actor);
    if (!this.isTaskEditableStatus(plan.status)) {
      throw new BadRequestException('Can only delete tasks in DRAFT, RETURNED, or PUBLISHED status');
    }

    const linkedTaskId = await this.prisma.$transaction(async (tx) => {
      const planTask = await tx.planTask.findFirst({ where: { id: taskId, planId } });
      if (!planTask) throw new NotFoundException('Plan task not found');

      await tx.planTask.delete({ where: { id: taskId } });
      if (planTask.taskId) {
        await tx.task.delete({ where: { id: planTask.taskId } });
      }
      return planTask.taskId;
    });

    this.audit.log({
      userId: actor.id,
      action: 'PLAN_TASK_AND_TASK_REMOVE',
      entity: 'PlanTask',
      entityId: taskId,
      metadata: { taskId: linkedTaskId },
    });
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

    const updated = await this.publishPlanInTx(id, actor);
    this.audit.log({ userId: actor.id, action: 'PLAN_PUBLISH', entity: 'Plan', entityId: id });
    return updated;
  }

  async send(id: string, actor: AuthUser) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can send plans');
    }
    const plan = await this.findOne(id, actor);
    if (plan.status !== PlanStatus.DRAFT && plan.status !== PlanStatus.RETURNED) {
      throw new BadRequestException('Can only send plans in DRAFT or RETURNED status');
    }

    const updated = await this.publishPlanInTx(id, actor);
    this.audit.log({ userId: actor.id, action: 'PLAN_SEND', entity: 'Plan', entityId: id });
    return updated;
  }

  private async publishPlanInTx(id: string, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      // Create real tasks for any plan tasks that are not yet linked.
      const planTasks = await tx.planTask.findMany({ where: { planId: id } });
      for (const pt of planTasks) {
        if (pt.taskId) continue;

        const newTaskId = await this.createTaskFromPlanTask(tx, pt, actor.id);
        if (newTaskId) {
          await tx.planTask.update({ where: { id: pt.id }, data: { taskId: newTaskId } });
        }
      }

      return tx.plan.update({
        where: { id },
        data: {
          status: PlanStatus.PUBLISHED,
          publishedAt: new Date(),
          reviewedById: actor.id,
        },
        include: planInclude,
      });
    });
  }

  private async createTaskFromPlanTask(
    tx: Prisma.TransactionClient,
    planTask: PlanTask,
    actorId: string,
  ): Promise<string | null> {
    if (planTask.taskId) return null;

    let newTaskId: string | null = null;
    if (planTask.isAutomated) {
      newTaskId = await this.workflow.handlePlanTaskReady(tx, planTask, actorId);
    }

    if (!newTaskId) {
      // Fallback: create a direct task from the plan task.
      const assigneeId = await this.resolvePlanTaskAssignee(tx, planTask, actorId);
      const dueDate = planTask.nextTaskDueDays
        ? new Date(Date.now() + planTask.nextTaskDueDays * 24 * 60 * 60 * 1000)
        : null;

      const task = await tx.task.create({
        data: {
          title: planTask.nextTaskTitle || planTask.title,
          description: planTask.nextTaskDescription || planTask.content || '',
          priority: planTask.nextTaskPriority || Priority.MEDIUM,
          status: TaskStatus.TODO,
          dueDate,
          assignedToId: assigneeId,
          createdById: actorId,
          isAutomated: !!planTask.nextTaskTitle,
          triggerStatus: planTask.nextTaskTitle ? TaskStatus.COMPLETED : null,
          nextTaskTitle: planTask.nextTaskTitle ?? null,
          nextTaskDescription: planTask.nextTaskDescription ?? null,
          nextTaskAssigneeId: planTask.nextTaskAssigneeId ?? null,
          nextTaskAssigneeRole: planTask.nextTaskAssigneeRole ?? null,
          nextTaskDueDays: planTask.nextTaskDueDays ?? null,
          nextTaskPriority: planTask.nextTaskPriority ?? null,
          requiresPublishing: planTask.requiresPublishing ?? false,
          nextTasks: planTask.nextTasks ?? undefined,
        },
      });

      await tx.taskHistory.create({
        data: {
          taskId: task.id,
          fromStatus: null,
          toStatus: TaskStatus.TODO,
          actorId,
          note: 'Task created from published plan',
        },
      });

      newTaskId = task.id;
    }

    return newTaskId;
  }

  private async resolvePlanTaskAssignee(
    tx: Prisma.TransactionClient,
    planTask: any,
    fallbackUserId: string,
  ): Promise<string> {
    if (planTask.requiresPublishing) {
      const resolved = await this.balancedAssignment.resolveAssigneeByRole(tx, Role.MODERATOR);
      if (resolved) return resolved;
    }
    if (planTask.nextTaskAssigneeId) return planTask.nextTaskAssigneeId;
    if (planTask.nextTaskAssigneeRole) {
      const resolved = await this.balancedAssignment.resolveAssigneeByRole(tx, planTask.nextTaskAssigneeRole);
      if (resolved) return resolved;
    }
    return fallbackUserId;
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
