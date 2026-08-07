import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignmentMode, Role, TaskStatus } from '@prisma/client';
import { AssignmentStrategy, TxClient } from './assignment-strategy';

/**
 * Assigns the task to the active employee with the fewest active
 * (non-completed) tasks. Ties are broken at random.
 */
@Injectable()
export class BalancedAssignmentStrategy implements AssignmentStrategy {
  readonly mode = AssignmentMode.BALANCED;

  async resolveAssignee(tx: TxClient): Promise<string> {
    const employees = await tx.user.findMany({
      where: { role: Role.EMPLOYEE, isActive: true },
      select: { id: true },
    });
    if (employees.length === 0) {
      throw new BadRequestException('No active employees available for balanced assignment');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const counts = await tx.task.groupBy({
      by: ['assignedToId'],
      where: {
        assignedToId: { in: employees.map((e) => e.id) },
        OR: [
          { status: { not: TaskStatus.COMPLETED } },
          { status: TaskStatus.COMPLETED, updatedAt: { gte: startOfToday } },
        ],
      },
      _count: { _all: true },
    });
    const workload = new Map<string, number>(counts.map((c) => [c.assignedToId, c._count._all]));

    let min = Infinity;
    for (const e of employees) {
      min = Math.min(min, workload.get(e.id) ?? 0);
    }
    const candidates = employees.filter((e) => (workload.get(e.id) ?? 0) === min);
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }
}
