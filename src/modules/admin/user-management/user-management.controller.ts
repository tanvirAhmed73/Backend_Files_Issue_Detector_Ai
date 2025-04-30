import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { CreateUserManagementDto, SubscriptionPlanType, SubscriptionStatus } from './dto/create-user-management.dto';
import { UpdateUserManagementDto } from './dto/update-user-management.dto';
import { ApiQuery } from '@nestjs/swagger';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@Controller('admin/user-management')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get('users-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'plan', enum: SubscriptionPlanType, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'year', type: Number, required: false })
  @ApiQuery({ name: 'month', type: Number, required: false })
  @ApiQuery({ name: 'status', enum: SubscriptionStatus, required: false })
  findAll(@Query() query: CreateUserManagementDto) {
    return this.userManagementService.findAll({
      filter: {
        search: query.search,
        plan: query.plan,
        status: query.status,
        limit: query.limit,
        page: query.page,
        year: query.year,
        month: query.month
      }
    });
  }
}
