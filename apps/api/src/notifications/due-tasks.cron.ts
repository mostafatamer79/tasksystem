import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class DueTasksCron {
  private readonly logger = new Logger(DueTasksCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Daily at 08:00 — notify assignees about tasks due tomorrow and overdue tasks. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDueTasks() {
    const now = new Date();
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

    const activeStatuses = {
      in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.RETURNED],
    };

    const [dueTomorrow, overdue] = await Promise.all([
      this.prisma.task.findMany({
        where: { status: activeStatuses, dueDate: { gte: startOfTomorrow, lt: endOfTomorrow } },
      }),
      this.prisma.task.findMany({
        where: { status: activeStatuses, dueDate: { lt: now } },
      }),
    ]);

    for (const task of dueTomorrow) {
      await this.notifications.notify({
        userId: task.assignedToId,
        type: 'TASK_DUE_TOMORROW',
        title: 'Task due tomorrow',
        body: `"${task.title}" is due tomorrow.`,
        taskId: task.id,
      });
    }
    for (const task of overdue) {
      await this.notifications.notify({
        userId: task.assignedToId,
        type: 'TASK_OVERDUE',
        title: 'Task overdue',
        body: `"${task.title}" is past its due date.`,
        taskId: task.id,
      });
    }

    this.logger.log(`Due-task cron: ${dueTomorrow.length} due-tomorrow, ${overdue.length} overdue`);
  }
}
