import { PartialType } from '@nestjs/swagger';
import { CreateApiManagementDto } from './create-api-management.dto';

export class UpdateApiManagementDto extends PartialType(CreateApiManagementDto) {}
