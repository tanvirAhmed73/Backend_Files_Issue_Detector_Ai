import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UserManagementModule } from './user-management/user-management.module';
import { UserProfileInfoModule } from './user-profile-info/user-profile-info.module';
import { RuleManagementModule } from './rule-management/rule-management.module';
import { ApiManagementModule } from './api-management/api-management.module';
import { SupoortModule } from './supoort/supoort.module';

@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    NotificationModule,
    DashboardModule,
    UserManagementModule,
    UserProfileInfoModule,
    RuleManagementModule,
    ApiManagementModule,
    SupoortModule,
  ],
})
export class AdminModule {}
