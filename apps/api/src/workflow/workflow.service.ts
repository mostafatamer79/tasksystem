import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { BalancedAssignmentStrategy } from '../tasks/strategies/balanced.strategy';
import { Task, TaskStatus, Role, Priority, Prisma } from '@prisma/client';
import {
  TOMORROW_APPOINTMENTS_TEMPLATE_ID,
  TOMORROW_APPOINTMENTS_TITLE,
} from './workflow-templates';

export type NextTaskCondition = 'ON_SUCCESS' | 'ON_RETURN';

export interface NextTaskDefinition {
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeRole?: Role;
  dueDays?: number;
  priority?: Priority;
  requiresPublishing?: boolean;
  condition?: NextTaskCondition;
  nextTasks?: NextTaskDefinition[];
}

function isNextTaskDefinitionArray(value: unknown): value is NextTaskDefinition[] {
  return Array.isArray(value);
}

export function normalizeWorkflowTitle(title: string): string {
  return title.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly balancedAssignment: BalancedAssignmentStrategy,
  ) {}

  async handleTaskTransition(
    tx: Prisma.TransactionClient,
    task: Task,
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
    actorId: string,
  ) {
    // 1. Trigger automated child tasks when the configured trigger status is reached.
    if (task.isAutomated && task.triggerStatus === toStatus) {
      await this.triggerNextAutomatedTasks(tx, task, toStatus, actorId);
    }

    // 2. Legacy / scalar publishing trigger: when a task with requiresPublishing is completed,
    //    spawn a moderator publish task as its child.
    if (task.requiresPublishing && toStatus === TaskStatus.COMPLETED) {
      await this.triggerPublishTask(tx, task, actorId);
    }

    // 3. Publishing propagation: a publish task completing/publishing marks its parent published.
    if (toStatus === TaskStatus.PUBLISHED || (toStatus === TaskStatus.COMPLETED && task.title.startsWith('Publish:'))) {
      if (task.parentTaskId) {
        const parent = await tx.task.findUnique({ where: { id: task.parentTaskId } });
        if (parent) {
          await tx.task.update({
            where: { id: parent.id },
            data: { status: TaskStatus.PUBLISHED },
          });

          await tx.taskHistory.create({
            data: {
              taskId: parent.id,
              fromStatus: parent.status,
              toStatus: TaskStatus.PUBLISHED,
              actorId,
              note: 'Parent content published by moderator',
            },
          });
        }
      }
    }

    // 4. Return propagation: a returned child bounces the parent back for rework.
    if (toStatus === TaskStatus.RETURNED && task.parentTaskId) {
      const parent = await tx.task.findUnique({ where: { id: task.parentTaskId } });
      if (parent) {
        await tx.task.update({
          where: { id: parent.id },
          data: { status: TaskStatus.RETURNED },
        });

        await tx.taskHistory.create({
          data: {
            taskId: parent.id,
            fromStatus: parent.status,
            toStatus: TaskStatus.RETURNED,
            actorId,
            note: 'Task returned because child task was rejected / returned',
          },
        });

        const notification = await tx.notification.create({
          data: {
            userId: parent.assignedToId,
            type: 'TASK_RETURNED',
            title: 'Task requires changes',
            body: `Your task "${parent.title}" was returned and requires changes.`,
            taskId: parent.id,
          },
        });

        this.gateway.emitToUser(parent.assignedToId, 'notification', notification);
      }
    }
  }

  async handlePlanTaskReady(
    tx: Prisma.TransactionClient,
    planTask: any,
    actorId: string,
  ): Promise<string | null> {
    if (!planTask.isAutomated) return null;
    if (planTask.taskId) return null;

    const assigneeId = planTask.requiresPublishing
      ? await this.balancedAssignment.resolveAssigneeByRole(tx, Role.MODERATOR)
      : await this.resolveAssignee(
          tx,
          planTask.nextTaskAssigneeId,
          planTask.nextTaskAssigneeRole,
          actorId,
        );

    const dueDate = this.computeDueDate(planTask.nextTaskDueDays);
    const taskData = {
      title: normalizeWorkflowTitle(planTask.nextTaskTitle || planTask.title),
      workflowTemplateId: planTask.workflowTemplateId ?? null,
      description: planTask.nextTaskDescription || '',
      priority: planTask.nextTaskPriority || Priority.MEDIUM,
      status: TaskStatus.TODO,
      dueDate,
      assignedToId: assigneeId,
      createdById: actorId,
      // Copy workflow configuration so the spawned task can continue the chain.
      isAutomated: !!planTask.nextTaskTitle,
      triggerStatus: planTask.nextTaskTitle ? TaskStatus.COMPLETED : null,
      nextTaskTitle: planTask.nextTaskTitle ?? null,
      nextTaskDescription: planTask.nextTaskDescription ?? null,
      nextTaskAssigneeId: planTask.nextTaskAssigneeId ?? null,
      nextTaskAssigneeRole: planTask.nextTaskAssigneeRole ?? null,
      nextTaskDueDays: planTask.nextTaskDueDays ?? null,
      nextTaskPriority: planTask.nextTaskPriority ?? null,
      requiresPublishing: planTask.requiresPublishing ?? false,
      nextTasks: planTask.nextTasks ?? null,
      rootTaskId: null,
      parentTaskId: null,
    };

    const reconciledTaskId = await this.reconcileTomorrowAppointmentsTask(tx, planTask, taskData);
    if (reconciledTaskId) return reconciledTaskId;

    const nextTask = await tx.task.create({
      data: taskData,
    });

    await tx.taskHistory.create({
      data: {
        taskId: nextTask.id,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        actorId,
        note: 'System automatically created task from Plan Workflow',
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: assigneeId,
        type: 'TASK_AUTOMATED_ASSIGNED',
        title: 'New workflow task assigned',
        body: `"${nextTask.title}" has been assigned to you.`,
        taskId: nextTask.id,
      },
    });

    this.gateway.emitToUser(assigneeId, 'notification', notification);

    return nextTask.id;
  }

  private async reconcileTomorrowAppointmentsTask(
    tx: Prisma.TransactionClient,
    planTask: any,
    taskData: Prisma.TaskUncheckedCreateInput,
  ): Promise<string | null> {
    if (
      !planTask.planId ||
      planTask.workflowTemplateId !== TOMORROW_APPOINTMENTS_TEMPLATE_ID
    ) return null;

    await this.lockPlan(tx, planTask.planId);
    const tomorrowTitle = normalizeWorkflowTitle(TOMORROW_APPOINTMENTS_TITLE);

    const activePlanTasks = await tx.task.findMany({
      where: {
        planTask: { planId: planTask.planId },
        workflowTemplateId: TOMORROW_APPOINTMENTS_TEMPLATE_ID,
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const matches = activePlanTasks.filter((task) => normalizeWorkflowTitle(task.title) === tomorrowTitle);
    const canonical = matches[0];
    if (!canonical) return null;

    const duplicateIds = matches.slice(1).map((task) => task.id);
    await tx.task.update({
      where: { id: canonical.id },
      data: {
        title: tomorrowTitle,
        workflowTemplateId: TOMORROW_APPOINTMENTS_TEMPLATE_ID,
        description: taskData.description,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        assignedToId: taskData.assignedToId,
        isAutomated: taskData.isAutomated,
        triggerStatus: taskData.triggerStatus,
        nextTaskTitle: taskData.nextTaskTitle,
        nextTaskDescription: taskData.nextTaskDescription,
        nextTaskAssigneeId: taskData.nextTaskAssigneeId,
        nextTaskAssigneeRole: taskData.nextTaskAssigneeRole,
        nextTaskDueDays: taskData.nextTaskDueDays,
        nextTaskPriority: taskData.nextTaskPriority,
        requiresPublishing: taskData.requiresPublishing,
        nextTasks: taskData.nextTasks,
      },
    });

    await tx.planTask.deleteMany({
      where: {
        id: { not: planTask.id },
        taskId: { in: matches.map((task) => task.id) },
      },
    });
    if (duplicateIds.length > 0) {
      await tx.task.deleteMany({ where: { id: { in: duplicateIds } } });
    }
    return canonical.id;
  }

  async reconcileLinkedPlanTask(
    tx: Prisma.TransactionClient,
    planTask: { id: string; planId: string; taskId: string | null; workflowTemplateId?: string | null },
  ): Promise<string | null> {
    if (
      !planTask.taskId ||
      planTask.workflowTemplateId !== TOMORROW_APPOINTMENTS_TEMPLATE_ID
    ) return planTask.taskId;

    await this.lockPlan(tx, planTask.planId);
    await tx.task.update({
      where: { id: planTask.taskId },
      data: { workflowTemplateId: TOMORROW_APPOINTMENTS_TEMPLATE_ID },
    });
    const activeMatches = await tx.task.findMany({
      where: {
        planTask: { planId: planTask.planId },
        workflowTemplateId: TOMORROW_APPOINTMENTS_TEMPLATE_ID,
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const canonical = activeMatches[0];
    if (!canonical) return planTask.taskId;
    const duplicateIds = activeMatches.slice(1).map((task) => task.id);
    await tx.planTask.deleteMany({
      where: {
        id: { not: planTask.id },
        taskId: { in: activeMatches.map((task) => task.id) },
      },
    });
    if (planTask.taskId !== canonical.id) {
      await tx.planTask.update({
        where: { id: planTask.id },
        data: { taskId: canonical.id },
      });
    }
    if (duplicateIds.length > 0) {
      await tx.task.deleteMany({ where: { id: { in: duplicateIds } } });
    }
    return canonical.id;
  }

  private async lockPlan(tx: Prisma.TransactionClient, planId: string): Promise<void> {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Plan" WHERE "id" = ${planId} FOR UPDATE`);
  }

  private async triggerNextAutomatedTasks(
    tx: Prisma.TransactionClient,
    parentTask: Task,
    toStatus: TaskStatus,
    actorId: string,
  ) {
    const definitions = this.buildNextTaskDefinitions(parentTask);
    if (definitions.length === 0) return;

    const expectedCondition: NextTaskCondition =
      toStatus === TaskStatus.RETURNED ? 'ON_RETURN' : 'ON_SUCCESS';

    for (const def of definitions) {
      const condition = def.condition || 'ON_SUCCESS';
      if (condition !== expectedCondition) continue;

      await this.spawnAutomatedChildTask(tx, parentTask, def, actorId);
    }
  }

  private buildNextTaskDefinitions(parentTask: Task): NextTaskDefinition[] {
    if (parentTask.nextTasks) {
      const parsed = parentTask.nextTasks as unknown;
      if (isNextTaskDefinitionArray(parsed)) {
        return parsed;
      }
    }

    if (parentTask.nextTaskTitle) {
      return [
        {
          title: parentTask.nextTaskTitle,
          description: parentTask.nextTaskDescription || undefined,
          assigneeId: parentTask.nextTaskAssigneeId || undefined,
          assigneeRole: parentTask.nextTaskAssigneeRole || undefined,
          dueDays: parentTask.nextTaskDueDays || undefined,
          priority: parentTask.nextTaskPriority || undefined,
          requiresPublishing: parentTask.requiresPublishing || undefined,
          condition: 'ON_SUCCESS',
        },
      ];
    }

    return [];
  }

  private async spawnAutomatedChildTask(
    tx: Prisma.TransactionClient,
    parentTask: Task,
    def: NextTaskDefinition,
    actorId: string,
  ): Promise<Task | null> {
    const existingTask = await tx.task.findFirst({
      where: {
        parentTaskId: parentTask.id,
        title: def.title,
      },
    });

    if (existingTask && existingTask.status !== TaskStatus.REJECTED && existingTask.status !== TaskStatus.CANCELLED) {
      this.logger.log(`Automated task for parent ${parentTask.id} already exists.`);
      return null;
    }

    const assigneeId = def.requiresPublishing
      ? await this.balancedAssignment.resolveAssigneeByRole(tx, Role.MODERATOR)
      : await this.resolveAssignee(tx, def.assigneeId, def.assigneeRole, parentTask.createdById);
    const dueDate = this.computeDueDate(def.dueDays);
    const rootTaskId = parentTask.rootTaskId || parentTask.id;

    const hasNestedAutomation = !!def.nextTasks && isNextTaskDefinitionArray(def.nextTasks) && def.nextTasks.length > 0;

    const nextTask = await tx.task.create({
      data: {
        title: def.title,
        description: def.description || '',
        priority: def.priority || parentTask.priority || Priority.MEDIUM,
        status: TaskStatus.TODO,
        dueDate,
        assignedToId: assigneeId,
        createdById: actorId,
        rootTaskId,
        parentTaskId: parentTask.id,
        isAutomated: hasNestedAutomation,
        triggerStatus: hasNestedAutomation ? TaskStatus.COMPLETED : null,
        nextTasks: hasNestedAutomation ? (def.nextTasks as unknown as Prisma.InputJsonValue) : undefined,
      },
    });

    await this.linkChildToParentPlan(tx, parentTask, nextTask);

    await tx.taskHistory.create({
      data: {
        taskId: nextTask.id,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        actorId,
        note: 'System automatically created task via workflow',
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: 'TASK_AUTOMATION_CREATE',
        entity: 'Task',
        entityId: nextTask.id,
        metadata: { parentTaskId: parentTask.id },
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: assigneeId,
        type: 'TASK_AUTOMATED_ASSIGNED',
        title: 'New workflow task assigned',
        body: `"${nextTask.title}" has been assigned to you.`,
        taskId: nextTask.id,
      },
    });

    this.gateway.emitToUser(assigneeId, 'notification', notification);

    return nextTask;
  }

  private async triggerPublishTask(tx: Prisma.TransactionClient, parentTask: Task, actorId: string) {
    const publishTitle = `Publish: ${parentTask.title}`;

    const existingPublish = await tx.task.findFirst({
      where: {
        parentTaskId: parentTask.id,
        title: publishTitle,
      },
    });

    if (existingPublish && existingPublish.status !== TaskStatus.REJECTED && existingPublish.status !== TaskStatus.CANCELLED) {
      return;
    }

    const moderatorId = await this.balancedAssignment.resolveAssigneeByRole(tx, Role.MODERATOR);

    const publishTask = await tx.task.create({
      data: {
        title: publishTitle,
        description: `Review and publish the content for "${parentTask.title}"`,
        priority: parentTask.priority,
        status: TaskStatus.WAITING_FOR_PUBLISHING,
        assignedToId: moderatorId,
        createdById: actorId,
        rootTaskId: parentTask.rootTaskId || parentTask.id,
        parentTaskId: parentTask.id,
      },
    });

    await this.linkChildToParentPlan(tx, parentTask, publishTask);

    await tx.taskHistory.create({
      data: {
        taskId: publishTask.id,
        fromStatus: null,
        toStatus: TaskStatus.WAITING_FOR_PUBLISHING,
        actorId,
        note: 'System automatically created Publish Task',
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: moderatorId,
        type: 'TASK_PUBLISH_READY',
        title: 'Content ready for publishing',
        body: `"${parentTask.title}" is ready for publishing.`,
        taskId: publishTask.id,
      },
    });

    this.gateway.emitToUser(moderatorId, 'notification', notification);
  }

  private async triggerPublishTaskForPlanTask(
    tx: Prisma.TransactionClient,
    spawnedTask: Task,
    planTask: any,
    actorId: string,
  ) {
    const publishTitle = `Publish: ${spawnedTask.title}`;

    const existingPublish = await tx.task.findFirst({
      where: {
        parentTaskId: spawnedTask.id,
        title: publishTitle,
      },
    });

    if (existingPublish && existingPublish.status !== TaskStatus.REJECTED && existingPublish.status !== TaskStatus.CANCELLED) {
      return;
    }

    const moderatorId = await this.balancedAssignment.resolveAssigneeByRole(tx, Role.MODERATOR);

    const publishTask = await tx.task.create({
      data: {
        title: publishTitle,
        description: `Review and publish the content for "${spawnedTask.title}"`,
        priority: spawnedTask.priority,
        status: TaskStatus.WAITING_FOR_PUBLISHING,
        assignedToId: moderatorId,
        createdById: actorId,
        rootTaskId: spawnedTask.id,
        parentTaskId: spawnedTask.id,
      },
    });

    // Link the publish task to the same plan as the originating plan task.
    if (planTask?.planId) {
      const maxSort = await tx.planTask.aggregate({
        where: { planId: planTask.planId },
        _max: { sortOrder: true },
      });

      await tx.planTask.create({
        data: {
          planId: planTask.planId,
          taskId: publishTask.id,
          title: publishTask.title,
          date: planTask.date,
          sortOrder: (maxSort._max.sortOrder || 0) + 1,
        },
      });
    }

    await tx.taskHistory.create({
      data: {
        taskId: publishTask.id,
        fromStatus: null,
        toStatus: TaskStatus.WAITING_FOR_PUBLISHING,
        actorId,
        note: 'System automatically created Publish Task from Plan',
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: moderatorId,
        type: 'TASK_PUBLISH_READY',
        title: 'Content ready for publishing',
        body: `"${spawnedTask.title}" is ready for publishing.`,
        taskId: publishTask.id,
      },
    });

    this.gateway.emitToUser(moderatorId, 'notification', notification);
  }

  private async linkChildToParentPlan(
    tx: Prisma.TransactionClient,
    parentTask: Task,
    childTask: Task,
  ) {
    const parent = await tx.task.findUnique({
      where: { id: parentTask.id },
      include: { planTask: true },
    });

    if (parent?.planTask?.planId) {
      const maxSort = await tx.planTask.aggregate({
        where: { planId: parent.planTask.planId },
        _max: { sortOrder: true },
      });

      await tx.planTask.create({
        data: {
          planId: parent.planTask.planId,
          taskId: childTask.id,
          title: childTask.title,
          date: parent.planTask.date,
          sortOrder: (maxSort._max.sortOrder || 0) + 1,
        },
      });
    }
  }

  private async resolveAssignee(
    tx: Prisma.TransactionClient,
    explicitAssigneeId?: string | null,
    role?: Role | null,
    fallbackUserId?: string,
  ): Promise<string> {
    if (explicitAssigneeId) return explicitAssigneeId;
    if (role) {
      const resolved = await this.balancedAssignment.resolveAssigneeByRole(tx, role);
      if (resolved) return resolved;
    }
    if (fallbackUserId) return fallbackUserId;
    throw new Error('Unable to resolve automated task assignee');
  }

  private computeDueDate(dueDays?: number | null): Date | null {
    if (!dueDays) return null;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    return dueDate;
  }
}
