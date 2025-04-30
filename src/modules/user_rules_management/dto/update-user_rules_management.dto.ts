import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserRulesManagementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;
}
