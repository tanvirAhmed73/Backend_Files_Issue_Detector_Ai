import { Module } from '@nestjs/common';
import { UserNotificationService } from './user-notification.service';
import { UserNotificationController } from './user-notification.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserNotificationController],
  providers: [UserNotificationService],
  exports: [UserNotificationService]  // Important: Export the service
})
export class UserNotificationModule {}
