import { BadRequestException, Injectable } from '@nestjs/common';
import { Role, TaskStatus } from '@prisma/client';

/**
 * Legal task status transitions per role.
 * Employee: TODO→IN_PROGRESS, IN_PROGRESS→TESTING, RETURNED→IN_PROGRESS.
 * Admin:    TESTING→COMPLETED (approve), TESTING→RETURNED (return).
 */
const EMPLOYEE_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.TESTING],
  [TaskStatus.RETURNED]: [TaskStatus.IN_PROGRESS],
};

const ADMIN_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  [TaskStatus.TESTING]: [TaskStatus.COMPLETED, TaskStatus.RETURNED],
};

@Injectable()
export class TaskStateMachine {
  canTransition(role: Role, from: TaskStatus, to: TaskStatus): boolean {
    const map = role === Role.ADMIN ? ADMIN_TRANSITIONS : EMPLOYEE_TRANSITIONS;
    return map[from]?.includes(to) ?? false;
  }

  assertTransition(role: Role, from: TaskStatus, to: TaskStatus): void {
    if (from === to) {
      throw new BadRequestException(`Task is already in status ${to}`);
    }
    if (!this.canTransition(role, from, to)) {
      const roleLabel = role === Role.ADMIN ? 'an admin' : 'an employee';
      throw new BadRequestException(
        `Transition ${from} → ${to} is not allowed for ${roleLabel}`,
      );
    }
  }

  /** Employees may only update progress on tasks that are IN_PROGRESS. */
  assertProgressUpdate(role: Role, status: TaskStatus): void {
    if (role === Role.ADMIN) return;
    if (status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Progress can only be updated while the task is IN_PROGRESS');
    }
  }
}
