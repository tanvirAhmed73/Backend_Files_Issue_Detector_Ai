import { IsNumber, IsOptional, IsString, IsEnum } from "class-validator";
import { Transform } from "class-transformer";

export enum SubscriptionPlanType {
  PAY_AS_YOU_GO = 'PAY_AS_YOU_GO',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
  BASIC = 'BASIC'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED'
}

export class CreateUserManagementDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(SubscriptionPlanType)
    plan?: SubscriptionPlanType;

    @IsOptional()
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    page?: number = 1;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    limit?: number = 12;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    year?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseInt(value))
    month?: number;
}
