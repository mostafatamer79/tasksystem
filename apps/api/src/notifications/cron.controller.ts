import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DueTasksCron } from './due-tasks.cron';

@ApiTags('cron')
@Controller('cron')
export class CronController {
  constructor(private readonly dueTasksCron: DueTasksCron) {}

  @Get('due-tasks')
  @ApiOperation({ summary: 'Trigger due-tasks cron manually or via Vercel Crons' })
  @ApiResponse({ status: 200, description: 'Cron executed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized secret' })
  async triggerDueTasks(@Headers('authorization') authHeader?: string) {
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is configured in env, enforce authorization
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        throw new UnauthorizedException('Invalid cron secret');
      }
    }

    await this.dueTasksCron.handleDueTasks();
    return { success: true, message: 'Due-tasks cron job executed' };
  }
}
