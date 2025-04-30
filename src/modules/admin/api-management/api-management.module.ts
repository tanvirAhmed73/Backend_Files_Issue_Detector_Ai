import { Module } from '@nestjs/common';
import { ApiManagementService } from './api-management.service';
import { ApiManagementController } from './api-management.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApiManagementController],
  providers: [ApiManagementService],
  exports: [ApiManagementService]  // Add this line to export the service
})
export class ApiManagementModule {}
