import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

export enum LogisticsType {
  MANAGER = 'logistic_manager',
  AGENT = 'logistic_agent',
}

export class LogisticsRegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  phone_number: string;

  @ApiProperty({ enum: LogisticsType, description: 'Type of logistics user' })
  @IsEnum(LogisticsType)
  type: LogisticsType;
}
