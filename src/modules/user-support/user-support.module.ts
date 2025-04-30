import { Module } from '@nestjs/common';
import { UserSupportService } from './user-support.service';
import { UserSupportController } from './user-support.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserNotificationModule } from '../user-notification/user-notification.module';

@Module({
  imports: [
    PrismaModule,
    UserNotificationModule  // Add this import
  ],
  controllers: [UserSupportController],
  providers: [UserSupportService]
})
export class UserSupportModule {}
