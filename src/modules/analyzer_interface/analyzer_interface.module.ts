import { Module } from '@nestjs/common';
import { AnalyzerInterfaceService } from './analyzer_interface.service';
import { AnalyzerInterfaceController } from './analyzer_interface.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApiManagementModule } from '../admin/api-management/api-management.module';

@Module({
  imports: [
    PrismaModule,
    ApiManagementModule  // Add this import
  ],
  controllers: [AnalyzerInterfaceController],
  providers: [AnalyzerInterfaceService]
})
export class AnalyzerInterfaceModule {}
