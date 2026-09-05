import { BadRequestException } from '@nestjs/common';
import { AssignmentMode, Priority, Role, TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';

describe('TasksService destructive operations', () => {
  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: Role.ADMIN,
    name: 'Admin',
    workStartTime: '09:00',
    workEndTime: '17:00',
  };
  const task = {
    id: 'task-1',
    title: 'Task',
    description: null,
    priority: Priority.MEDIUM,
    status: TaskStatus.IN_PROGRESS,
    dueDate: null,
    assignedToId: 'user-1',
    createdById: admin.id,
    attachmentLink: null,
    estimatedHours: null,
    actualHours: null,
    progress: 20,
    assignmentMode: AssignmentMode.MANUAL,
    createdAt: new Date('2026-09-03T12:00:00.000Z'),
    updatedAt: new Date('2026-09-04T12:00:00.000Z'),
    isAutomated: false,
    triggerStatus: null,
    nextTaskTitle: null,
    nextTaskDescription: null,
    nextTaskAssigneeId: null,
    nextTaskAssigneeRole: null,
    nextTaskDueDays: null,
    nextTaskPriority: null,
    requiresPublishing: false,
    nextTasks: null,
    rootTaskId: null,
    parentTaskId: null,
  };

  const tx = {
    task: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    planTask: { deleteMany: jest.fn() },
    archivedStat: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const audit = { log: jest.fn() };
  const repo = { findById: jest.fn() };
  const stateMachine = {};
  const gateway = {};
  const manual = { mode: AssignmentMode.MANUAL };
  const balanced = { mode: AssignmentMode.BALANCED };
  const workflow = {};

  let service: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx.task.findMany.mockResolvedValue([task]);
    tx.task.deleteMany.mockResolvedValue({ count: 1 });
    tx.planTask.deleteMany.mockResolvedValue({ count: 0 });
    tx.archivedStat.upsert.mockResolvedValue({});
    tx.archivedStat.deleteMany.mockResolvedValue({ count: 0 });
    service = new TasksService(
      prisma as never,
      repo as never,
      stateMachine as never,
      audit as never,
      gateway as never,
      manual as never,
      balanced as never,
      workflow as never,
    );
  });

  it('filters an all-scope deletion by one status and an inclusive creation-date range', async () => {
    const result = await service.bulkDelete({
      all: true,
      status: TaskStatus.IN_PROGRESS,
      fromDate: '2026-09-01',
      toDate: '2026-09-05',
      removeFromDashboard: true,
    }, admin);

    expect(tx.task.findMany).toHaveBeenCalledWith({
      where: {
        status: TaskStatus.IN_PROGRESS,
        createdAt: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lt: new Date('2026-09-06T00:00:00.000Z'),
        },
      },
    });
    expect(tx.archivedStat.upsert).not.toHaveBeenCalled();
    expect(tx.task.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [task.id] } } });
    expect(result).toEqual({ deletedCount: 1 });
  });

  it('preserves archived dashboard totals by default', async () => {
    await service.bulkDelete({ ids: [task.id] }, admin);

    expect(tx.archivedStat.upsert).toHaveBeenCalledWith({
      where: { key: 'global_total' },
      update: { value: { increment: 1 } },
      create: { key: 'global_total', value: 1 },
    });
  });

  it('translates the legacy completed selector to a status filter', async () => {
    await service.bulkDelete({ allCompleted: true }, admin);

    expect(tx.task.findMany).toHaveBeenCalledWith({ where: { status: TaskStatus.COMPLETED } });
  });

  it('returns zero without delete or archive writes when no tasks match', async () => {
    tx.task.findMany.mockResolvedValue([]);

    await expect(service.bulkDelete({ all: true }, admin)).resolves.toEqual({ deletedCount: 0 });
    expect(tx.archivedStat.upsert).not.toHaveBeenCalled();
    expect(tx.task.deleteMany).not.toHaveBeenCalled();
  });

  it('reports the database deletion count from a serializable transaction', async () => {
    tx.task.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.bulkDelete({
      ids: [task.id],
      removeFromDashboard: true,
    }, admin)).resolves.toEqual({ deletedCount: 0 });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('rejects an empty selector', async () => {
    await expect(service.bulkDelete({}, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a creation-date range whose start is after its end', async () => {
    await expect(service.bulkDelete({
      all: true,
      fromDate: '2026-09-06',
      toDate: '2026-09-05',
    }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('clears every archived statistic without deleting live tasks', async () => {
    tx.archivedStat.deleteMany.mockResolvedValue({ count: 7 });

    await expect(service.clearDashboardArchive(admin)).resolves.toEqual({ deletedCount: 7 });
    expect(tx.archivedStat.deleteMany).toHaveBeenCalledWith({});
    expect(tx.task.deleteMany).not.toHaveBeenCalled();
  });
});
