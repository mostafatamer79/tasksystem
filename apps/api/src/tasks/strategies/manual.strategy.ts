import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignmentMode } from '@prisma/client';
import { AssignmentStrategy, TxClient } from './assignment-strategy';

@Injectable()
export class ManualAssignmentStrategy implements AssignmentStrategy {
  readonly mode = AssignmentMode.MANUAL;

  async resolveAssignee(tx: TxClient, requestedAssigneeId?: string): Promise<string> {
    if (!requestedAssigneeId) {
      throw new BadRequestException('assignedToId is required for MANUAL assignment');
    }
    const user = await tx.user.findUnique({ where: { id: requestedAssigneeId } });
    if (!user) throw new BadRequestException('Assignee not found');
    if (!user.isActive) throw new BadRequestException('Assignee is disabled');
    return user.id;
  }
}
