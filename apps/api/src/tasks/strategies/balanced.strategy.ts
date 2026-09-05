import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignmentMode, Role, TaskStatus } from '@prisma/client';
import { AssignmentStrategy, TxClient } from './assignment-strategy';

@Injectable()
export class BalancedAssignmentStrategy implements AssignmentStrategy {
  readonly mode = AssignmentMode.BALANCED;

  async resolveAssignee(tx: TxClient, requestedAssigneeId?: string): Promise<string> {
    return this.resolveAssigneeByRole(tx, Role.EMPLOYEE);
  }

  async resolveAssigneeByRole(tx: TxClient, targetRole: Role): Promise<string> {
    const users = await tx.user.findMany({
      where: { role: targetRole, isActive: true },
      select: { id: true },
    });
    if (users.length === 0) {
      throw new BadRequestException(`No active ${targetRole} available for balanced assignment`);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const counts = await tx.task.groupBy({
      by: ['assignedToId'],
      where: {
        assignedToId: { in: users.map((u) => u.id) },
        OR: [
          { status: { notIn: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED, TaskStatus.REJECTED, TaskStatus.CANCELLED] } },
          { status: { in: [TaskStatus.COMPLETED, TaskStatus.PUBLISHED] }, updatedAt: { gte: startOfToday } },
        ],
      },
      _count: { _all: true },
    });
    
    const workload = new Map<string, number>(counts.map((c) => [c.assignedToId, c._count._all]));

    let min = Infinity;
    for (const u of users) {
      min = Math.min(min, workload.get(u.id) ?? 0);
    }
    const candidates = users.filter((u) => (workload.get(u.id) ?? 0) === min);
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }
}
