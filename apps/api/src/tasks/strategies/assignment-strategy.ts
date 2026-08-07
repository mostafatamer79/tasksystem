import { AssignmentMode } from '@prisma/client';
import { Prisma } from '@prisma/client';

export type TxClient = Prisma.TransactionClient;

/**
 * Resolves which user a task should be assigned to.
 * Implementations run inside the task-creation transaction.
 */
export interface AssignmentStrategy {
  readonly mode: AssignmentMode;
  resolveAssignee(tx: TxClient, requestedAssigneeId?: string): Promise<string>;
}
