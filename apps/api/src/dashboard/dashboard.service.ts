import { Injectable } from '@nestjs/common';
import { TaskStatus, Priority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async getArchivedStats() {
    const stats = await this.prisma.archivedStat.findMany();
    const map = new Map<string, number>();
    for (const s of stats) map.set(s.key, s.value);
    return map;
  }

  async adminStats() {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [byStatus, total, employees, dueToday, overdue, arch] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.task.count(),
      this.prisma.user.count({ where: { role: 'EMPLOYEE', isActive: true } }),
      this.prisma.task.count({
        where: {
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] },
          dueDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lt: endOfToday },
        },
      }),
      this.prisma.task.count({
        where: { status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] }, dueDate: { lt: now } },
      }),
      this.getArchivedStats(),
    ]);

    const count = (s: TaskStatus) => (byStatus.find((b) => b.status === s)?._count._all ?? 0) + (arch.get(`global_status_${s}`) ?? 0);
    const totalWithArchived = total + (arch.get('global_total') ?? 0);
    const completedTasks = count(TaskStatus.COMPLETED) + count(TaskStatus.PUBLISHED);

    return {
      totalTasks: totalWithArchived,
      activeTasks: totalWithArchived - completedTasks,
      completedTasks,
      testingTasks: count(TaskStatus.TESTING),
      returnedTasks: count(TaskStatus.RETURNED),
      publishedTasks: count(TaskStatus.PUBLISHED),
      inProgressTasks: count(TaskStatus.IN_PROGRESS),
      todoTasks: count(TaskStatus.TODO),
      activeEmployees: employees,
      dueToday,
      overdue,
    };
  }

  async adminCharts() {
    const [perEmployee, byStatus, byPriority, completed, arch] = await Promise.all([
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
      this.getArchivedStats(),
    ]);

    const users = await this.prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.name]));

    const perMonth = new Map<string, number>();
    for (const t of completed) {
      const key = `${t.updatedAt.getFullYear()}-${String(t.updatedAt.getMonth() + 1).padStart(2, '0')}`;
      perMonth.set(key, (perMonth.get(key) ?? 0) + 1);
    }
    for (const [k, v] of arch.entries()) {
      if (k.startsWith('month_')) {
        const month = k.replace('month_', '');
        perMonth.set(month, (perMonth.get(month) ?? 0) + v);
      }
    }

    const tasksPerEmployee = users.map(u => {
      const liveCount = perEmployee.find(p => p.assignedToId === u.id)?._count._all ?? 0;
      const archivedCount = arch.get(`user_${u.id}_total`) ?? 0;
      return {
        employeeId: u.id,
        employeeName: u.name,
        count: liveCount + archivedCount,
      };
    }).filter(e => e.count > 0);

    const statuses = Object.values(TaskStatus);
    const statusDistribution = statuses.map(s => {
      const live = byStatus.find(b => b.status === s)?._count._all ?? 0;
      const archived = arch.get(`global_status_${s}`) ?? 0;
      return { status: s, count: live + archived };
    }).filter(s => s.count > 0);

    const priorities = Object.values(Priority);
    const priorityDistribution = priorities.map(p => {
      const live = byPriority.find(b => b.priority === p)?._count._all ?? 0;
      const archived = arch.get(`global_priority_${p}`) ?? 0;
      return { priority: p, count: live + archived };
    }).filter(p => p.count > 0);

    return {
      tasksPerEmployee,
      statusDistribution,
      priorityDistribution,
      completedPerMonth: [...perMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
    };
  }

  async adminEmployeesStats(date?: string) {
    let dateFilter: { createdAt?: { gte: Date; lt: Date } } = {};
    let isFiltered = false;
    if (date && date !== 'all') {
      isFiltered = true;
      let base: Date;
      if (date === 'today') {
        const n = new Date();
        base = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      } else if (date === 'yesterday') {
        const n = new Date();
        base = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
      } else {
        const [y, m, d] = date.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          base = new Date(y, m - 1, d);
        }
      }
      if (base!) {
        dateFilter = { createdAt: { gte: base, lt: new Date(base.getTime() + 86_400_000) } };
      }
    }

    const [employees, arch] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'EMPLOYEE', isActive: true },
        select: { id: true, name: true, department: true, position: true, avatarUrl: true },
        orderBy: { name: 'asc' },
      }),
      this.getArchivedStats()
    ]);

    if (employees.length === 0) return [];

    const taskGroups = await this.prisma.task.groupBy({
      by: ['assignedToId', 'status'],
      where: { assignedToId: { in: employees.map((e) => e.id) }, ...dateFilter },
      _count: { _all: true },
    });

    return employees.map((emp) => {
      const empGroups = taskGroups.filter((g) => g.assignedToId === emp.id);
      
      const getCount = (s: TaskStatus) => {
        const live = empGroups.find((g) => g.status === s)?._count._all ?? 0;
        const archived = isFiltered ? 0 : (arch.get(`user_${emp.id}_status_${s}`) ?? 0);
        return live + archived;
      };

      const liveTotal = empGroups.reduce((acc, g) => acc + g._count._all, 0);
      const totalTasks = liveTotal + (isFiltered ? 0 : (arch.get(`user_${emp.id}_total`) ?? 0));

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        position: emp.position,
        avatarUrl: emp.avatarUrl,
        totalTasks,
        todoTasks: getCount(TaskStatus.TODO),
        inProgressTasks: getCount(TaskStatus.IN_PROGRESS),
        testingTasks: getCount(TaskStatus.TESTING),
        completedTasks: getCount(TaskStatus.COMPLETED) + getCount(TaskStatus.PUBLISHED),
        returnedTasks: getCount(TaskStatus.RETURNED),
        publishedTasks: getCount(TaskStatus.PUBLISHED),
      };
    });
  }

  async employeeStats(userId: string) {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mine = { assignedToId: userId };

    const [byStatus, dueToday, overdue, avgProgress, arch] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where: mine, _count: { _all: true } }),
      this.prisma.task.count({
        where: {
          ...mine,
          status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] },
          dueDate: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lt: endOfToday },
        },
      }),
      this.prisma.task.count({
        where: { ...mine, status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] }, dueDate: { lt: now } },
      }),
      this.prisma.task.aggregate({
        where: { ...mine, status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] } },
        _avg: { progress: true },
      }),
      this.getArchivedStats()
    ]);

    const count = (s: TaskStatus) => (byStatus.find((b) => b.status === s)?._count._all ?? 0) + (arch.get(`user_${userId}_status_${s}`) ?? 0);
    const liveTotal = byStatus.reduce((acc, b) => acc + b._count._all, 0);
    const totalTasks = liveTotal + (arch.get(`user_${userId}_total`) ?? 0);

    return {
      totalTasks,
      todoTasks: count(TaskStatus.TODO),
      inProgressTasks: count(TaskStatus.IN_PROGRESS),
      testingTasks: count(TaskStatus.TESTING),
      completedTasks: count(TaskStatus.COMPLETED) + count(TaskStatus.PUBLISHED),
      returnedTasks: count(TaskStatus.RETURNED),
      publishedTasks: count(TaskStatus.PUBLISHED),
      dueToday,
      overdue,
      averageProgress: Math.round(avgProgress._avg.progress ?? 0),
    };
  }
}
