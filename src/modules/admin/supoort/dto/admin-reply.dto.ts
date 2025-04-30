import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminReplyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}