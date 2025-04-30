import { PartialType } from '@nestjs/swagger';
import { CreateUserSupportDto } from './create-user-support.dto';

export class UpdateUserSupportDto extends PartialType(CreateUserSupportDto) {}
