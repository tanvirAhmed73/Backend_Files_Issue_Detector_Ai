import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserSupportDto {
  @ApiProperty({ description: 'The subject of the support ticket' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Detailed description of the issue' })
  @IsNotEmpty()
  @IsString()
  description: string;
}