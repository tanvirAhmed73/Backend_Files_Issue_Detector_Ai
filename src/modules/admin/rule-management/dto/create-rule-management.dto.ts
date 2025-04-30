import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RuleQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 12;


  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value == 'true' || value == true) {
      return true;
    } else {
      return false;
    }
  })
  is_draft?: string;
}

export class CreateRuleManagementDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;
  is_draft?: boolean; // Add this field
}
