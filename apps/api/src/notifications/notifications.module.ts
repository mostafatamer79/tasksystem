import { Global, Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CronController } from './cron.controller';
import { DueTasksCron } from './due-tasks.cron';

@Global()
@Module({
  providers: [NotificationsGateway, NotificationsService, DueTasksCron],
  controllers: [NotificationsController, CronController],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
