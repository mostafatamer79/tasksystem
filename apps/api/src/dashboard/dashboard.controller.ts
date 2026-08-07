import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('admin/stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard stat cards (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Aggregate stats' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN only' })
  adminStats() {
    return this.dashboard.adminStats();
  }

  @Get('admin/charts')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard chart data (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Chart datasets' })
  adminCharts() {
    return this.dashboard.adminCharts();
  }

  @Get('employee/stats')
  @ApiOperation({ summary: 'Employee dashboard stats for the current user' })
  @ApiResponse({ status: 200, description: 'Own task stats' })
  employeeStats(@CurrentUser() user: AuthUser) {
    return this.dashboard.employeeStats(user.id);
  }
}
