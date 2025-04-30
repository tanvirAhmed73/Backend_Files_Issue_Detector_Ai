import { Module } from '@nestjs/common';
import { RuleManagementService } from './rule-management.service';
import { RuleManagementController } from './rule-management.controller';

@Module({
  controllers: [RuleManagementController],
  providers: [RuleManagementService],
})
export class RuleManagementModule {}
