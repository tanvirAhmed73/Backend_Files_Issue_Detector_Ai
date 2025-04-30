import { PartialType } from '@nestjs/swagger';
import { CreateUserNotificationDto } from './create-user-notification.dto';

export class UpdateUserNotificationDto extends PartialType(CreateUserNotificationDto) {}
