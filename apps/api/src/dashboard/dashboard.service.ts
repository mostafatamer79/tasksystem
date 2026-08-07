import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async adminStats() {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [byStatus, total, employees, dueToday, overdue] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.task.count(),
      this.prisma.user.count({ where: { role: 'EMPLOYEE', isActive: true } }),
      this.prisma.task.count({
        where: {
          status: { not: TaskStatus.COMPLETED },
          dueDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lt: endOfToday },
        },
      }),
      this.prisma.task.count({
        where: { status: { not: TaskStatus.COMPLETED }, dueDate: { lt: now } },
      }),
    ]);

    const count = (s: TaskStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    return {
      totalTasks: total,
      activeTasks: total - count(TaskStatus.COMPLETED),
      completedTasks: count(TaskStatus.COMPLETED),
      testingTasks: count(TaskStatus.TESTING),
      returnedTasks: count(TaskStatus.RETURNED),
      inProgressTasks: count(TaskStatus.IN_PROGRESS),
      todoTasks: count(TaskStatus.TODO),
      activeEmployees: employees,
      dueToday,
      overdue,
    };
  }

  async adminCharts() {
    const [perEmployee, byStatus, byPriority, completed] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['assignedToId'],
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.task.groupBy({ by: ['priority'], _count: { _all: true } }),
      this.prisma.task.findMany({
        where: { status: TaskStatus.COMPLETED },
        select: { updatedAt: true },
      }),
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: perEmployee.map((p) => p.assignedToId) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.name]));

    const perMonth = new Map<string, number>();
    for (const t of completed) {
      const key = `${t.updatedAt.getFullYear()}-${String(t.updatedAt.getMonth() + 1).padStart(2, '0')}`;
      perMonth.set(key, (perMonth.get(key) ?? 0) + 1);
    }

    return {
      tasksPerEmployee: perEmployee.map((p) => ({
        employeeId: p.assignedToId,
        employeeName: nameOf.get(p.assignedToId) ?? 'Unknown',
        count: p._count._all,
      })),
      statusDistribution: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      priorityDistribution: byPriority.map((p) => ({ priority: p.priority, count: p._count._all })),
      completedPerMonth: [...perMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
    };
  }

  async employeeStats(userId: string) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mine = { assignedToId: userId };

    const [byStatus, dueToday, overdue, avgProgress] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where: mine, _count: { _all: true } }),
      this.prisma.task.count({
        where: {
          ...mine,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lt: endOfToday },
        },
      }),
      this.prisma.task.count({
        where: { ...mine, status: { not: TaskStatus.COMPLETED }, dueDate: { lt: now } },
      }),
      this.prisma.task.aggregate({
        where: { ...mine, status: { not: TaskStatus.COMPLETED } },
        _avg: { progress: true },
      }),
    ]);

    const count = (s: TaskStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    return {
      totalTasks: byStatus.reduce((acc, b) => acc + b._count._all, 0),
      todoTasks: count(TaskStatus.TODO),
      inProgressTasks: count(TaskStatus.IN_PROGRESS),
      testingTasks: count(TaskStatus.TESTING),
      completedTasks: count(TaskStatus.COMPLETED),
      returnedTasks: count(TaskStatus.RETURNED),
      dueToday,
      overdue,
      averageProgress: Math.round(avgProgress._avg.progress ?? 0),
    };
  }
}
