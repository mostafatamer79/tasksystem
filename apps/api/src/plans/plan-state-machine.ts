import { Injectable, ForbiddenException } from '@nestjs/common';
import { PlanStatus, Role } from '@prisma/client';

@Injectable()
export class PlanStateMachine {
  private readonly adminTransitions: Record<PlanStatus, PlanStatus[]> = {
    DRAFT: [PlanStatus.SUBMITTED],
    RETURNED: [PlanStatus.DRAFT, PlanStatus.SUBMITTED],
    SUBMITTED: [],
    PUBLISHED: [],
  };

  private readonly moderatorTransitions: Record<PlanStatus, PlanStatus[]> = {
    SUBMITTED: [PlanStatus.PUBLISHED, PlanStatus.RETURNED],
    DRAFT: [],
    RETURNED: [],
    PUBLISHED: [],
  };

  validateTransition(role: Role, currentStatus: PlanStatus, newStatus: PlanStatus): void {
    if (currentStatus === newStatus) return;

    let allowed: PlanStatus[] = [];

    if (role === 'ADMIN') {
      allowed = this.adminTransitions[currentStatus] || [];
    } else if (role === 'MODERATOR') {
      allowed = this.moderatorTransitions[currentStatus] || [];
    }

    if (!allowed.includes(newStatus)) {
      throw new ForbiddenException(
        `Invalid status transition from ${currentStatus} to ${newStatus} for role ${role}`,
      );
    }
  }
}
