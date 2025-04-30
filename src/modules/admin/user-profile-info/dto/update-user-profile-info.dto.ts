import { PartialType } from '@nestjs/swagger';
import { CreateUserProfileInfoDto } from './create-user-profile-info.dto';

export class UpdateUserProfileInfoDto extends PartialType(CreateUserProfileInfoDto) {}
