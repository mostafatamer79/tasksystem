import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

function startOfDay(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getOrCreateToday(userId: string) {
    const today = startOfDay(new Date());
    const existing = await this.prisma.attendance.findUnique({
      where: { userId_date: { userId, date: today } },
      include: { pauses: true },
    });
    if (existing) return existing;
    return this.prisma.attendance.create({
      data: { userId, date: today },
      include: { pauses: true },
    });
  }

  async getToday(actor: AuthUser) {
    return this.getOrCreateToday(actor.id);
  }

  async checkIn(actor: AuthUser) {
    const today = await this.getOrCreateToday(actor.id);
    if (today.checkIn) {
      throw new BadRequestException('You have already checked in today');
    }
    if (today.checkOut) {
      throw new BadRequestException('You have already checked out today');
    }
    const updated = await this.prisma.attendance.update({
      where: { id: today.id },
      data: { checkIn: new Date() },
      include: { pauses: true },
    });
    this.audit.log({
      userId: actor.id,
      action: 'ATTENDANCE_CHECK_IN',
      entity: 'Attendance',
      entityId: updated.id,
    });
    return updated;
  }

  async checkOut(actor: AuthUser) {
    const today = await this.getOrCreateToday(actor.id);
    if (!today.checkIn) {
      throw new BadRequestException('You must check in before checking out');
    }
    if (today.checkOut) {
      throw new BadRequestException('You have already checked out today');
    }
    const now = new Date();
    const openPause = today.pauses.find((p) => !p.endedAt);
    if (openPause) {
      await this.prisma.attendancePause.update({
        where: { id: openPause.id },
        data: { endedAt: now },
      });
    }
    const updated = await this.prisma.attendance.update({
      where: { id: today.id },
      data: { checkOut: now },
      include: { pauses: true },
    });
    this.audit.log({
      userId: actor.id,
      action: 'ATTENDANCE_CHECK_OUT',
      entity: 'Attendance',
      entityId: updated.id,
    });
    return updated;
  }

  async startPause(actor: AuthUser) {
    const today = await this.getOrCreateToday(actor.id);
    if (!today.checkIn) {
      throw new BadRequestException('You must check in before pausing');
    }
    if (today.checkOut) {
      throw new BadRequestException('You have already checked out');
    }
    const openPause = today.pauses.find((p) => !p.endedAt);
    if (openPause) {
      throw new BadRequestException('Pause is already active');
    }
    const pause = await this.prisma.attendancePause.create({
      data: { attendanceId: today.id, startedAt: new Date() },
    });
    this.audit.log({
      userId: actor.id,
      action: 'ATTENDANCE_PAUSE_START',
      entity: 'AttendancePause',
      entityId: pause.id,
    });
    return this.prisma.attendance.findUnique({
      where: { id: today.id },
      include: { pauses: true },
    });
  }

  async endPause(actor: AuthUser) {
    const today = await this.getOrCreateToday(actor.id);
    const openPause = today.pauses.find((p) => !p.endedAt);
    if (!openPause) {
      throw new BadRequestException('No active pause');
    }
    const now = new Date();
    const ended = await this.prisma.attendancePause.update({
      where: { id: openPause.id },
      data: { endedAt: now },
    });
    const elapsed = Math.floor((now.getTime() - new Date(openPause.startedAt).getTime()) / 1000);
    await this.prisma.attendance.update({
      where: { id: today.id },
      data: { totalPausedSeconds: { increment: elapsed } },
    });
    this.audit.log({
      userId: actor.id,
      action: 'ATTENDANCE_PAUSE_END',
      entity: 'AttendancePause',
      entityId: ended.id,
      metadata: { elapsedSeconds: elapsed },
    });
    return this.prisma.attendance.findUnique({
      where: { id: today.id },
      include: { pauses: true },
    });
  }
}
