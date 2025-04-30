import { IsEnum, IsOptional } from 'class-validator';

enum SupportStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED'
}

export class UpdateSupoortDto {
  @IsEnum(SupportStatus)
  @IsOptional()
  status?: SupportStatus;
}
