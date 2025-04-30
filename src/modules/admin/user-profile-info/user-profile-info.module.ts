import { Module } from '@nestjs/common';
import { UserProfileInfoService } from './user-profile-info.service';
import { UserProfileInfoController } from './user-profile-info.controller';

@Module({
  controllers: [UserProfileInfoController],
  providers: [UserProfileInfoService],
})
export class UserProfileInfoModule {}
