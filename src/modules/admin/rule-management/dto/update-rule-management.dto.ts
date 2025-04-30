import { PartialType } from '@nestjs/swagger';
import { CreateRuleManagementDto } from './create-rule-management.dto';

export class UpdateRuleManagementDto extends PartialType(CreateRuleManagementDto) {}
