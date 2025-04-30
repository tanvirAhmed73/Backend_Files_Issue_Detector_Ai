import { Controller, Get, UseGuards, Query, HttpException, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async findAll(
    @Query('year') year?: number, 
    @Query('month') month?: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    try {
      const result = await this.dashboardService.findAll(year, month, page, limit);
      return {
        status: HttpStatus.OK,
        message: 'Dashboard data retrieved successfully',
        data: result
      };
    } catch (error) {
      throw new HttpException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message || 'Internal server error',
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
