import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  taskId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /** Persist a notification and push it over the socket in real time. */
  async notify(input: NotifyInput): Promise<Notification> {
    const notification = await this.prisma.notification.create({ data: input });
    this.gateway.emitToUser(input.userId, 'notification', notification);
    return notification;
  }

  async listForUser(userId: string, page: number, limit: number) {
    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { data, total, unread, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
