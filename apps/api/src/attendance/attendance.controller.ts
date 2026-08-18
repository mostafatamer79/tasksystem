import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('today')
  @ApiOperation({ summary: "Get today's attendance for the current user" })
  @ApiResponse({ status: 200, description: "Today's attendance" })
  today(@CurrentUser() actor: AuthUser) {
    return this.attendance.getToday(actor);
  }

  @Post('check-in')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check in for the day' })
  @ApiResponse({ status: 200, description: 'Checked in' })
  @ApiResponse({ status: 400, description: 'Already checked in or checked out' })
  checkIn(@CurrentUser() actor: AuthUser) {
    return this.attendance.checkIn(actor);
  }

  @Post('check-out')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check out for the day' })
  @ApiResponse({ status: 200, description: 'Checked out' })
  @ApiResponse({ status: 400, description: 'Not checked in or already checked out' })
  checkOut(@CurrentUser() actor: AuthUser) {
    return this.attendance.checkOut(actor);
  }

  @Post('pause/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start a pause break' })
  @ApiResponse({ status: 200, description: 'Pause started' })
  @ApiResponse({ status: 400, description: 'Cannot start pause' })
  startPause(@CurrentUser() actor: AuthUser) {
    return this.attendance.startPause(actor);
  }

  @Post('pause/end')
  @HttpCode(200)
  @ApiOperation({ summary: 'End the active pause break' })
  @ApiResponse({ status: 200, description: 'Pause ended' })
  @ApiResponse({ status: 400, description: 'No active pause' })
  endPause(@CurrentUser() actor: AuthUser) {
    return this.attendance.endPause(actor);
  }
}
