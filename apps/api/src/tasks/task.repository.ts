import { Injectable } from '@nestjs/common';
import { Prisma, Role, Task, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TxClient } from './strategies/assignment-strategy';
import { paginate, Paginated } from '../common/dto/pagination.dto';
import { QueryTasksDto, UpdateTaskDto } from './dto/task.dto';

export const taskInclude = {
  assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Paginated task list. Employee scope (`assignedToId = self`) is enforced
   * HERE at the repository level — never only in the controller.
   */
  async findAll(query: QueryTasksDto, actor: { id: string; role: Role }): Promise<Paginated<Task>> {
    const where: Prisma.TaskWhereInput = {
      ...(actor.role !== Role.ADMIN ? { assignedToId: actor.id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignedToId && actor.role === Role.ADMIN ? { assignedToId: query.assignedToId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const allowedSort = ['title', 'createdAt', 'updatedAt', 'dueDate', 'priority', 'status'];
    const sortBy = query.sortBy && allowedSort.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
        include: taskInclude,
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginate(data, total, query);
  }

  /** Same scope enforcement for single-record access. */
  async findById(id: string, actor: { id: string; role: Role }) {
    const where: Prisma.TaskWhereInput = {
      id,
      ...(actor.role !== Role.ADMIN ? { assignedToId: actor.id } : {}),
    };
    return this.prisma.task.findFirst({ where, include: taskInclude });
  }

  createInTx(tx: TxClient, data: Prisma.TaskUncheckedCreateInput) {
    return tx.task.create({ data, include: taskInclude });
  }

  update(id: string, data: UpdateTaskDto) {
    return this.prisma.task.update({ where: { id }, data, include: taskInclude });
  }

  async transitionInTx(
    tx: TxClient,
    input: {
      taskId: string;
      fromStatus: TaskStatus;
      toStatus: TaskStatus;
      actorId: string;
      note?: string;
      extraData?: Prisma.TaskUncheckedUpdateInput;
      notification: { userId: string; type: string; title: string; body: string };
      audit: { userId: string; action: string; entityId: string; metadata?: Prisma.InputJsonValue };
    },
  ) {
    const task = await tx.task.update({
      where: { id: input.taskId },
      data: { status: input.toStatus, ...input.extraData },
      include: taskInclude,
    });
    const [history, notification, audit] = await Promise.all([
      tx.taskHistory.create({
        data: {
          taskId: input.taskId,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          actorId: input.actorId,
          note: input.note,
        },
      }),
      tx.notification.create({
        data: { ...input.notification, taskId: input.taskId },
      }),
      tx.auditLog.create({
        data: {
          userId: input.audit.userId,
          action: input.audit.action,
          entity: 'Task',
          entityId: input.audit.entityId,
          metadata: input.audit.metadata,
        },
      }),
    ]);
    return { task, history, notification, audit };
  }

  addComment(taskId: string, authorId: string, body: string) {
    return this.prisma.comment.create({
      data: { taskId, authorId, body },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  listComments(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  listHistory(taskId: string) {
    return this.prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, name: true } } },
    });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
