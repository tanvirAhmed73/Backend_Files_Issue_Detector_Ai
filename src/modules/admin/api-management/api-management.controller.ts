import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiManagementService } from './api-management.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';

@ApiTags('api-management')
@Controller('admin/api-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class ApiManagementController {
  constructor(private readonly apiManagementService: ApiManagementService) {}

  @Get('usage-overview')
  async getApiUsageOverview(
    @Req() req,
    @Query('period') period: 'day' | 'month' = 'month'
  ) {
    const userId = req.user.userId;
    const usage = await this.apiManagementService.getApiUsageOverview(userId, period);
    return {
      success: true,
      data: usage
    };
  }

  @Get('daily-usage')
  async getDailyUsage(
    @Req() req,
    @Query('year') year: number = new Date().getFullYear(),
    @Query('month') month: number = new Date().getMonth() + 1
  ) {
    const userId = req.user.userId;
    const usage = await this.apiManagementService.getDailyUsage(userId, year, month);
    return {
      success: true,
      data: usage
    };
  }

  @Get('user-usages')
  async getUserUsages(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('year') year: number = new Date().getFullYear(),
    @Query('month') month: number = new Date().getMonth() + 1
  ) {
    const usage = await this.apiManagementService.getUserUsages(page, limit, year, month);
    return {
      success: true,
      data: usage
    };
  }
}
