import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget audit write; never throws. */
  log(entry: AuditEntry): void {
    this.prisma.auditLog
      .create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          metadata: entry.metadata,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      })
      .catch((err: Error) => this.logger.error(`Audit write failed: ${err.message}`));
  }
}
