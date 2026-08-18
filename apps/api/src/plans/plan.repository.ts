import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Plan, PlanTask } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { paginate, Paginated } from '../common/dto/pagination.dto';
import { QueryPlansDto, CreatePlanTaskDto, UpdatePlanDto, UpdatePlanTaskDto, UpsertPlanTaskDto } from './dto/plan.dto';

export const planInclude = {
  createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
  reviewedBy: { select: { id: true, name: true } },
  tasks: { 
    orderBy: { sortOrder: 'asc' },
    include: {
      task: {
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } }
        }
      }
    }
  },
} satisfies Prisma.PlanInclude;

@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPlansDto, actor: AuthUser): Promise<Paginated<Plan>> {
    const where: Prisma.PlanWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.createdById ? { createdById: query.createdById } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { teacherName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Employees only see PUBLISHED plans.
    if (actor.role === 'EMPLOYEE') {
      where.status = 'PUBLISHED';
    }

    const allowedSort = ['createdAt', 'updatedAt', 'title', 'periodStart'];
    const sortBy = query.sortBy && allowedSort.includes(query.sortBy) ? query.sortBy : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder },
        include: planInclude,
      }),
      this.prisma.plan.count({ where }),
    ]);

    return paginate(data as unknown as Plan[], total, query);
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.plan.findUnique({
      where: { id },
      include: planInclude,
    });
  }

  async create(data: Prisma.PlanUncheckedCreateInput, tasks: CreatePlanTaskDto[]): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data,
      });

      if (tasks.length > 0) {
        await tx.planTask.createMany({
          data: tasks.map((t, index) => ({
            ...t,
            planId: plan.id,
            sortOrder: t.sortOrder ?? index,
          })),
        });
      }

      return tx.plan.findUnique({
        where: { id: plan.id },
        include: planInclude,
      });
    });
  }

  async update(id: string, data: Prisma.PlanUncheckedUpdateInput): Promise<any> {
    return this.prisma.plan.update({
      where: { id },
      data,
      include: planInclude,
    });
  }

  async upsertTasks(planId: string, tasks: UpsertPlanTaskDto[]): Promise<PlanTask[]> {
    return this.prisma.$transaction(async (tx) => {
      const existingTasks = await tx.planTask.findMany({ where: { planId } });
      const existingIds = existingTasks.map((t) => t.id);
      const newIds = tasks.map((t) => t.id).filter(Boolean) as string[];

      const toDelete = existingIds.filter((id) => !newIds.includes(id));
      if (toDelete.length > 0) {
        await tx.planTask.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const [index, task] of tasks.entries()) {
        const sortOrder = task.sortOrder ?? index;
        if (task.id) {
          await tx.planTask.update({
            where: { id: task.id },
            data: { ...task, sortOrder, planId },
          });
        } else {
          await tx.planTask.create({
            data: { ...task, sortOrder, planId },
          });
        }
      }

      return tx.planTask.findMany({ where: { planId }, orderBy: { sortOrder: 'asc' } });
    });
  }

  async addTask(planId: string, data: CreatePlanTaskDto): Promise<PlanTask> {
    const maxSort = await this.prisma.planTask.aggregate({
      where: { planId },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    return this.prisma.planTask.create({
      data: {
        ...data,
        planId,
        sortOrder: data.sortOrder ?? nextSort,
      },
    });
  }

  async updateTask(taskId: string, data: UpdatePlanTaskDto): Promise<PlanTask> {
    return this.prisma.planTask.update({
      where: { id: taskId },
      data,
    });
  }

  async removeTask(taskId: string): Promise<void> {
    await this.prisma.planTask.delete({ where: { id: taskId } });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.plan.delete({ where: { id } });
  }
}
