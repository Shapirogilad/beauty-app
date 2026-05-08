import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { RemindersService } from './reminders.service'
import { WaitlistService } from './waitlist.service'

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, RemindersService, WaitlistService],
  exports: [NotificationsService, WaitlistService],
})
export class NotificationsModule {}
