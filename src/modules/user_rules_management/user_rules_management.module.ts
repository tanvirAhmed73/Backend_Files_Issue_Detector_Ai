import { Module } from '@nestjs/common';
import { UserRulesManagementService } from './user_rules_management.service';
import { UserRulesManagementController } from './user_rules_management.controller';

@Module({
  controllers: [UserRulesManagementController],
  providers: [UserRulesManagementService],
})
export class UserRulesManagementModule {}
