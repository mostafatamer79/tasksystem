import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentMode, Prisma, Role, Task, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { TaskRepository } from './task.repository';
import { TaskStateMachine } from './state-machine/task-state-machine';
import { AssignmentStrategy } from './strategies/assignment-strategy';
import { ManualAssignmentStrategy } from './strategies/manual.strategy';
import { BalancedAssignmentStrategy } from './strategies/balanced.strategy';
import {
  CreateTaskDto,
  QueryTasksDto,
  ReturnTaskDto,
  UpdateTaskDto,
} from './dto/task.dto';

@Injectable()
export class TasksService {
  private readonly strategies: Record<AssignmentMode, AssignmentStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: TaskRepository,
    private readonly stateMachine: TaskStateMachine,
    private readonly audit: AuditService,
    private readonly gateway: NotificationsGateway,
    manual: ManualAssignmentStrategy,
    balanced: BalancedAssignmentStrategy,
  ) {
    this.strategies = { [manual.mode]: manual, [balanced.mode]: balanced };
  }

  findAll(query: QueryTasksDto, actor: AuthUser) {
    return this.repo.findAll(query, actor);
  }

  async findOne(id: string, actor: AuthUser) {
    const task = await this.repo.findById(id, actor);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto, actor: AuthUser) {
    const strategy = this.strategies[dto.assignmentMode];
    const { assignedToId, ...rest } = dto;
    const task = await this.prisma.$transaction(async (tx) => {
      const resolvedAssignee = await strategy.resolveAssignee(tx, assignedToId);
      const created = await this.repo.createInTx(tx, {
        ...rest,
        assignedToId: resolvedAssignee,
        createdById: actor.id,
      });
      await Promise.all([
        tx.taskHistory.create({
          data: {
            taskId: created.id,
            fromStatus: null,
            toStatus: TaskStatus.TODO,
            actorId: actor.id,
            note: `Task created (${dto.assignmentMode} assignment)`,
          },
        }),
        tx.notification.create({
          data: {
            userId: resolvedAssignee,
            type: 'TASK_ASSIGNED',
            title: 'New task assigned',
            body: `"${created.title}" has been assigned to you.`,
            taskId: created.id,
          },
        }),
        tx.auditLog.create({
          data: {
            userId: actor.id,
            action: 'TASK_CREATE',
            entity: 'Task',
            entityId: created.id,
            metadata: { assignmentMode: dto.assignmentMode, assignedToId: resolvedAssignee },
          },
        }),
      ]);
      return { created, resolvedAssignee };
    });
    this.gateway.emitToUser(task.resolvedAssignee, 'notification', {
      type: 'TASK_ASSIGNED',
      taskId: task.created.id,
    });
    return task.created;
  }

  /** Full edit — ADMIN only (enforced by RolesGuard on the controller). */
  async update(id: string, dto: UpdateTaskDto, actor: AuthUser) {
    const existing = await this.repo.findById(id, actor);
    if (!existing) throw new NotFoundException('Task not found');
    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assignedToId } });
      if (!assignee || !assignee.isActive) throw new NotFoundException('Assignee not found or disabled');
    }
    const reassigned = dto.assignedToId && dto.assignedToId !== existing.assignedToId;
    const task = await this.repo.update(id, dto);
    this.audit.log({
      userId: actor.id,
      action: 'TASK_UPDATE',
      entity: 'Task',
      entityId: id,
      metadata: dto as unknown as Prisma.InputJsonValue,
    });
    if (reassigned && dto.assignedToId) {
      await this.prisma.notification.create({
        data: {
          userId: dto.assignedToId,
          type: 'TASK_ASSIGNED',
          title: 'Task reassigned to you',
          body: `"${task.title}" has been assigned to you.`,
          taskId: id,
        },
      });
      this.gateway.emitToUser(dto.assignedToId, 'notification', { type: 'TASK_ASSIGNED', taskId: id });
    }
    return task;
  }

  async remove(id: string, actor: AuthUser) {
    const existing = await this.repo.findById(id, actor);
    if (!existing) throw new NotFoundException('Task not found');
    await this.repo.remove(id);
    this.audit.log({ userId: actor.id, action: 'TASK_DELETE', entity: 'Task', entityId: id });
  }

  async updateProgress(id: string, progress: number, actor: AuthUser) {
    const task = await this.getOwnedOrAdminTask(id, actor);
    this.stateMachine.assertProgressUpdate(actor.role, task.status);
    const updated = await this.repo.update(id, { progress });
    this.audit.log({
      userId: actor.id,
      action: 'TASK_PROGRESS',
      entity: 'Task',
      entityId: id,
      metadata: { progress },
    });
    return updated;
  }

  /** Employee: TODO→IN_PROGRESS or RETURNED→IN_PROGRESS. */
  startWork(id: string, actor: AuthUser) {
    return this.transition(id, actor, TaskStatus.IN_PROGRESS, 'TASK_START', 'Task started');
  }

  /** Employee: IN_PROGRESS→TESTING. */
  submitTesting(id: string, actor: AuthUser) {
    return this.transition(id, actor, TaskStatus.TESTING, 'TASK_SUBMIT_TESTING', 'Task submitted for testing');
  }

  /** Admin: TESTING→COMPLETED. */
  approve(id: string, actor: AuthUser) {
    return this.transition(id, actor, TaskStatus.COMPLETED, 'TASK_APPROVED', 'Task approved', {
      progress: 100,
    });
  }

  /** Admin: TESTING→RETURNED. */
  returnTask(id: string, dto: ReturnTaskDto, actor: AuthUser) {
    return this.transition(id, actor, TaskStatus.RETURNED, 'TASK_RETURNED', 'Task returned', {}, dto.note);
  }

  private async transition(
    id: string,
    actor: AuthUser,
    to: TaskStatus,
    auditAction: string,
    note: string,
    extraData: Prisma.TaskUncheckedUpdateInput = {},
    customNote?: string,
  ) {
    const task = await this.getOwnedOrAdminTask(id, actor);
    this.stateMachine.assertTransition(actor.role, task.status, to);

    const notifyUserId = actor.role === Role.ADMIN ? task.assignedToId : task.createdById;
    const result = await this.prisma.$transaction(async (tx) =>
      this.repo.transitionInTx(tx, {
        taskId: id,
        fromStatus: task.status,
        toStatus: to,
        actorId: actor.id,
        note: customNote ?? note,
        extraData,
        notification: {
          userId: notifyUserId,
          type: auditAction,
          title: note,
          body: `"${task.title}": ${task.status} → ${to}`,
        },
        audit: {
          userId: actor.id,
          action: auditAction,
          entityId: id,
          metadata: { from: task.status, to },
        },
      }),
    );
    this.gateway.emitToUser(notifyUserId, 'notification', result.notification);
    return result.task;
  }

  /** Employees can only touch their own tasks — enforced via repository scope. */
  private async getOwnedOrAdminTask(id: string, actor: AuthUser): Promise<Task> {
    const task = await this.repo.findById(id, actor);
    if (!task) {
      if (actor.role !== Role.ADMIN) {
        throw new ForbiddenException('Task not found or not assigned to you');
      }
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async addComment(id: string, body: string, actor: AuthUser) {
    await this.getOwnedOrAdminTask(id, actor);
    const comment = await this.repo.addComment(id, actor.id, body);
    this.audit.log({ userId: actor.id, action: 'TASK_COMMENT', entity: 'Task', entityId: id });
    return comment;
  }

  async listComments(id: string, actor: AuthUser) {
    await this.getOwnedOrAdminTask(id, actor);
    return this.repo.listComments(id);
  }

  async listHistory(id: string, actor: AuthUser) {
    await this.getOwnedOrAdminTask(id, actor);
    return this.repo.listHistory(id);
  }
}
