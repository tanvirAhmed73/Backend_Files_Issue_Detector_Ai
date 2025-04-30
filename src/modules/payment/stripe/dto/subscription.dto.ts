import { IsNotEmpty, IsString, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SubscriptionPlanType {
  PAY_AS_YOU_GO = 'PAY_AS_YOU_GO',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

import { Transform } from 'class-transformer';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the subscriber'
  })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the subscriber'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'pm_123456789',
    description: 'Stripe payment method ID'
  })
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @ApiProperty({
    enum: BillingCycle,
    example: 'monthly',
    description: 'Billing cycle (monthly/yearly)'
  })
  @IsNotEmpty()
  @IsEnum(BillingCycle, {
    message: 'billingOption must be either "monthly" or "yearly"'
  })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(BillingCycle)
  billingOption: BillingCycle;

  @ApiProperty({
    example: 'United States',
    description: 'Country of the subscriber'
  })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({
    enum: SubscriptionPlanType,
    example: 'PRO',
    description: 'Subscription plan type'
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionPlanType, {
    message: 'planType must be one of: PAY_AS_YOU_GO, BASIC, PRO, ENTERPRISE'
  })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(SubscriptionPlanType)
  planType: SubscriptionPlanType;
}