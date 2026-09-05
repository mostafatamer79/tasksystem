import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { BalancedAssignmentStrategy } from '../tasks/strategies/balanced.strategy';
import { TaskStatus, Role, Priority } from '@prisma/client';

function createMockTx(overrides: Record<string, jest.Mock> = {}) {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'plan-1' }]),
    task: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    taskHistory: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    },
    auditLog: {
      create: jest.fn(),
    },
    planTask: {
      aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 0 } }),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    ...overrides,
  };
}

describe('WorkflowService', () => {
  let service: WorkflowService;
  let gateway: NotificationsGateway;
  let balancedAssignment: BalancedAssignmentStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: {} },
        { provide: NotificationsGateway, useValue: { emitToUser: jest.fn() } },
        { provide: BalancedAssignmentStrategy, useValue: { resolveAssigneeByRole: jest.fn() } },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    balancedAssignment = module.get<BalancedAssignmentStrategy>(BalancedAssignmentStrategy);
  });

  describe('handleTaskTransition', () => {
    it('spawns a child task when trigger status is reached', async () => {
      const tx = createMockTx();
      const parent = {
        id: 'parent-1',
        title: 'Parent Task',
        isAutomated: true,
        triggerStatus: TaskStatus.COMPLETED,
        nextTaskTitle: 'Review Parent',
        nextTaskDescription: 'Please review',
        nextTaskAssigneeRole: Role.MODERATOR,
        nextTaskDueDays: 2,
        nextTaskPriority: Priority.HIGH,
        createdById: 'creator-1',
        priority: Priority.MEDIUM,
        requiresPublishing: false,
      } as any;

      tx.task.findFirst.mockResolvedValue(null);
      tx.task.create.mockResolvedValue({ id: 'child-1', title: 'Review Parent' });
      (balancedAssignment.resolveAssigneeByRole as jest.Mock).mockResolvedValue('moderator-1');

      await service.handleTaskTransition(tx as any, parent, TaskStatus.TESTING, TaskStatus.COMPLETED, 'actor-1');

      expect(tx.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Review Parent',
          parentTaskId: 'parent-1',
          rootTaskId: 'parent-1',
          assignedToId: 'moderator-1',
          status: TaskStatus.TODO,
        }),
      });
      expect(tx.taskHistory.create).toHaveBeenCalled();
      expect(gateway.emitToUser).toHaveBeenCalledWith('moderator-1', 'notification', expect.anything());
    });

    it('spawns parallel children from nextTasks JSON', async () => {
      const tx = createMockTx();
      const parent = {
        id: 'parent-2',
        title: 'Content',
        isAutomated: true,
        triggerStatus: TaskStatus.COMPLETED,
        nextTasks: [
          { title: 'Create Slides', assigneeRole: Role.EMPLOYEE, dueDays: 2 },
          { title: 'Record Video', assigneeRole: Role.EMPLOYEE, dueDays: 3 },
        ],
        createdById: 'creator-1',
        priority: Priority.MEDIUM,
      } as any;

      tx.task.findFirst.mockResolvedValue(null);
      tx.task.create.mockResolvedValue({ id: 'child-1', title: 'Create Slides' });
      (balancedAssignment.resolveAssigneeByRole as jest.Mock).mockResolvedValue('employee-1');

      await service.handleTaskTransition(tx as any, parent, TaskStatus.TESTING, TaskStatus.COMPLETED, 'actor-1');

      expect(tx.task.create).toHaveBeenCalledTimes(2);
      expect(tx.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Create Slides' }),
        }),
      );
      expect(tx.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Record Video' }),
        }),
      );
    });

    it('does not duplicate an existing active child task', async () => {
      const tx = createMockTx();
      const parent = {
        id: 'parent-3',
        title: 'Parent',
        isAutomated: true,
        triggerStatus: TaskStatus.COMPLETED,
        nextTaskTitle: 'Child',
        createdById: 'creator-1',
      } as any;

      tx.task.findFirst.mockResolvedValue({ id: 'child-existing', status: TaskStatus.TODO });

      await service.handleTaskTransition(tx as any, parent, TaskStatus.TESTING, TaskStatus.COMPLETED, 'actor-1');

      expect(tx.task.create).not.toHaveBeenCalled();
    });

    it('bounces parent back to RETURNED when child is RETURNED', async () => {
      const tx = createMockTx();
      const child = {
        id: 'child-1',
        title: 'Child',
        parentTaskId: 'parent-1',
        assignedToId: 'employee-1',
      } as any;

      const parent = { id: 'parent-1', status: TaskStatus.COMPLETED, assignedToId: 'employee-2' };
      tx.task.findUnique.mockResolvedValue(parent);
      tx.task.update.mockResolvedValue({ ...parent, status: TaskStatus.RETURNED });

      await service.handleTaskTransition(tx as any, child, TaskStatus.TESTING, TaskStatus.RETURNED, 'actor-1');

      expect(tx.task.update).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
        data: { status: TaskStatus.RETURNED },
      });
      expect(tx.taskHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: 'parent-1',
            fromStatus: TaskStatus.COMPLETED,
            toStatus: TaskStatus.RETURNED,
          }),
        }),
      );
      expect(gateway.emitToUser).toHaveBeenCalledWith('employee-2', 'notification', expect.anything());
    });

    it('publishes parent when publish task is completed', async () => {
      const tx = createMockTx();
      const publishTask = {
        id: 'publish-1',
        title: 'Publish: Parent',
        parentTaskId: 'parent-1',
      } as any;

      const parent = { id: 'parent-1', status: TaskStatus.COMPLETED };
      tx.task.findUnique.mockResolvedValue(parent);

      await service.handleTaskTransition(tx as any, publishTask, TaskStatus.TESTING, TaskStatus.COMPLETED, 'actor-1');

      expect(tx.task.update).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
        data: { status: TaskStatus.PUBLISHED },
      });
      expect(tx.taskHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: 'parent-1',
            fromStatus: TaskStatus.COMPLETED,
            toStatus: TaskStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('spawns ON_RETURN children when task is RETURNED', async () => {
      const tx = createMockTx();
      const parent = {
        id: 'parent-4',
        title: 'Review',
        isAutomated: true,
        triggerStatus: TaskStatus.RETURNED,
        nextTasks: [
          { title: 'Rework Content', condition: 'ON_RETURN', assigneeRole: Role.EMPLOYEE },
          { title: 'Optional Success', condition: 'ON_SUCCESS', assigneeRole: Role.EMPLOYEE },
        ],
        createdById: 'creator-1',
      } as any;

      tx.task.findFirst.mockResolvedValue(null);
      tx.task.create.mockResolvedValue({ id: 'rework-1', title: 'Rework Content' });
      (balancedAssignment.resolveAssigneeByRole as jest.Mock).mockResolvedValue('employee-1');

      await service.handleTaskTransition(tx as any, parent, TaskStatus.TESTING, TaskStatus.RETURNED, 'actor-1');

      expect(tx.task.create).toHaveBeenCalledTimes(1);
      expect(tx.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Rework Content' }),
        }),
      );
    });
  });

  describe('handlePlanTaskReady', () => {
    it('creates a task from a plan task and copies workflow config', async () => {
      const tx = createMockTx();
      const planTask = {
        id: 'plan-task-1',
        planId: 'plan-1',
        title: 'Lesson Draft',
        isAutomated: true,
        nextTaskTitle: 'Review Lesson',
        nextTaskAssigneeRole: Role.MODERATOR,
        nextTaskDueDays: 2,
        nextTaskPriority: Priority.HIGH,
        date: new Date(),
      };

      tx.task.create.mockResolvedValue({ id: 'task-1', title: 'Review Lesson' });
      (balancedAssignment.resolveAssigneeByRole as jest.Mock).mockResolvedValue('moderator-1');

      const result = await service.handlePlanTaskReady(tx as any, planTask, 'actor-1');

      expect(result).toBe('task-1');
      expect(tx.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Review Lesson',
            isAutomated: true,
            triggerStatus: TaskStatus.COMPLETED,
            assignedToId: 'moderator-1',
          }),
        }),
      );
    });

    it('returns null when plan task is not automated', async () => {
      const tx = createMockTx();
      const planTask = { id: 'pt-1', isAutomated: false };

      const result = await service.handlePlanTaskReady(tx as any, planTask, 'actor-1');

      expect(result).toBeNull();
      expect(tx.task.create).not.toHaveBeenCalled();
    });

    it('returns null when plan task already has a linked task', async () => {
      const tx = createMockTx();
      const planTask = { id: 'pt-1', isAutomated: true, taskId: 'task-1' };

      const result = await service.handlePlanTaskReady(tx as any, planTask, 'actor-1');

      expect(result).toBeNull();
      expect(tx.task.create).not.toHaveBeenCalled();
    });

    it('updates the newest active tomorrow task and removes active duplicates', async () => {
      const tx = createMockTx();
      const planTask = {
        id: 'plan-task-current',
        planId: 'plan-1',
        title: ' مواعيد   بكرا ',
        workflowTemplateId: 'tomorrow-appointments',
        isAutomated: true,
        nextTaskDueDays: 1,
        nextTaskPriority: Priority.MEDIUM,
        date: new Date('2026-09-05T00:00:00.000Z'),
      };
      tx.task.findMany.mockResolvedValue([
        { id: 'newest', title: ' مواعيد   بكرا ', status: TaskStatus.TODO, updatedAt: new Date('2026-09-05') },
        { id: 'older', title: 'مواعيد بكرا', status: TaskStatus.IN_PROGRESS, updatedAt: new Date('2026-09-04') },
      ]);
      tx.task.update.mockResolvedValue({ id: 'newest', title: 'مواعيد بكرا' });

      const result = await service.handlePlanTaskReady(tx as any, planTask, 'actor-1');

      expect(result).toBe('newest');
      expect(tx.task.update).toHaveBeenCalledWith({
        where: { id: 'newest' },
        data: expect.objectContaining({ title: 'مواعيد بكرا', assignedToId: 'actor-1' }),
      });
      expect(tx.planTask.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'plan-task-current' },
          taskId: { in: ['newest', 'older'] },
        },
      });
      expect(tx.task.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['older'] } } });
      expect(tx.task.create).not.toHaveBeenCalled();
    });

    it('keeps completed tomorrow history and creates a new active occurrence', async () => {
      const tx = createMockTx();
      const planTask = {
        id: 'plan-task-current',
        planId: 'plan-1',
        title: 'مواعيد بكرا',
        workflowTemplateId: 'tomorrow-appointments',
        isAutomated: true,
        date: new Date('2026-09-05T00:00:00.000Z'),
      };
      tx.task.findMany.mockResolvedValue([]);
      tx.task.create.mockResolvedValue({ id: 'fresh', title: 'مواعيد بكرا' });

      const result = await service.handlePlanTaskReady(tx as any, planTask, 'actor-1');

      expect(result).toBe('fresh');
      expect(tx.task.findMany).toHaveBeenCalledWith({
        where: {
          planTask: { planId: 'plan-1' },
          workflowTemplateId: 'tomorrow-appointments',
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] },
        },
        orderBy: { updatedAt: 'desc' },
      });
      expect(tx.task.create).toHaveBeenCalled();
    });

    it('does not reconcile an ordinary same-title task without template identity', async () => {
      const tx = createMockTx();
      const planTask = {
        id: 'ordinary-plan-task',
        planId: 'plan-1',
        title: 'مواعيد بكرا',
        isAutomated: true,
        date: new Date('2026-09-05T00:00:00.000Z'),
      };
      tx.task.create.mockResolvedValue({ id: 'ordinary-task', title: 'مواعيد بكرا' });

      await service.handlePlanTaskReady(tx as any, planTask, 'actor-1');

      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.task.findMany).not.toHaveBeenCalled();
      expect(tx.task.deleteMany).not.toHaveBeenCalled();
      expect(tx.task.create).toHaveBeenCalled();
    });

    it('removes older active linked template tasks after a new plan link is added', async () => {
      const tx = createMockTx();
      tx.task.findMany.mockResolvedValue([
        { id: 'new-task', workflowTemplateId: 'tomorrow-appointments' },
        { id: 'old-task', workflowTemplateId: 'tomorrow-appointments' },
      ]);

      const result = await service.reconcileLinkedPlanTask(tx as any, {
        id: 'new-plan-task',
        planId: 'plan-1',
        taskId: 'new-task',
        workflowTemplateId: 'tomorrow-appointments',
      });

      expect(result).toBe('new-task');
      expect(tx.task.update).toHaveBeenCalledWith({
        where: { id: 'new-task' },
        data: { workflowTemplateId: 'tomorrow-appointments' },
      });
      expect(tx.planTask.deleteMany).toHaveBeenCalledWith({
        where: { id: { not: 'new-plan-task' }, taskId: { in: ['new-task', 'old-task'] } },
      });
      expect(tx.task.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['old-task'] } } });
    });

    it('repoints an older current link to the newest canonical template task', async () => {
      const tx = createMockTx();
      tx.task.findMany.mockResolvedValue([
        { id: 'newest-task', updatedAt: new Date('2026-09-05') },
        { id: 'older-current-task', updatedAt: new Date('2026-09-04') },
      ]);

      const result = await service.reconcileLinkedPlanTask(tx as any, {
        id: 'current-plan-task',
        planId: 'plan-1',
        taskId: 'older-current-task',
        workflowTemplateId: 'tomorrow-appointments',
      });

      expect(result).toBe('newest-task');
      expect(tx.planTask.update).toHaveBeenCalledWith({
        where: { id: 'current-plan-task' },
        data: { taskId: 'newest-task' },
      });
      expect(tx.task.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['older-current-task'] } },
      });
    });
  });
});
