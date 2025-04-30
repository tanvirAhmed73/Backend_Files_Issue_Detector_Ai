import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { RuleManagementService } from './rule-management.service';
import { CreateRuleManagementDto, RuleQueryDto } from './dto/create-rule-management.dto';
import { UpdateRuleManagementDto } from './dto/update-rule-management.dto';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { boolean } from 'zod';

@Controller('admin/rule-management')
export class RuleManagementController {
  constructor(private readonly ruleManagementService: RuleManagementService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'is_draft', type: Boolean, required: false })
  async findAll(@Query() query: RuleQueryDto) {
    try {
      return await this.ruleManagementService.findAll(query);
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    try {
      return await this.ruleManagementService.findOne(id);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    try {
      return await this.ruleManagementService.remove(id);
    } catch (error) {
      throw error;
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(
    @Body() createRuleManagementDto: CreateRuleManagementDto,
    @Req() req: Request
  ) {
    // Add logging to debug the request user object
    // console.log('Request user:', req.user);
    
    // Access userId from the correct path in the request object
    const userId = req.user?.['userId'] || req.user?.['id'];
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return await this.ruleManagementService.create(createRuleManagementDto, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string, 
    @Body() updateRuleManagementDto: UpdateRuleManagementDto,
    @Req() req: Request
  ) {
    return await this.ruleManagementService.update(id, updateRuleManagementDto, req.user['id']);
  }
}
