import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UserRulesManagementService } from './user_rules_management.service';
import { CreateUserRulesManagementDto } from './dto/create-user_rules_management.dto';
import { UpdateUserRulesManagementDto } from './dto/update-user_rules_management.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('user-rules-management')
@UseGuards(JwtAuthGuard)
export class UserRulesManagementController {
  constructor(private readonly userRulesManagementService: UserRulesManagementService) {}

  @Get("my-rules")
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: Request) {    
    try {
      const userId = req.user.userId;
      return await this.userRulesManagementService.findAllByUserId(userId);
    } catch (error) {
      throw error;
    }
  }

  @Get('rule/:ruleId')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('ruleId') ruleId: string,
    @Req() req: Request
  ) {
    try {
      const userId = req.user.userId;
      return await this.userRulesManagementService.findOneByUserId(ruleId, userId);
    } catch (error) {
      throw error;
    }
  }

  @Patch('update-rule/:ruleId')
  @UseGuards(JwtAuthGuard)
  async updateRule(
    @Param('ruleId') ruleId: string,
    @Body() updateDto: UpdateUserRulesManagementDto,
    @Req() req: Request
  ) {
    try {
      const userId = req.user.userId;
      return await this.userRulesManagementService.updateRule(ruleId, updateDto, userId);
    } catch (error) {
      throw error;
    }
  }

  @Delete('delete-rule/:ruleId')
  async deleteRule(
    @Param('ruleId') ruleId: string,
    @Req() req: Request
  ) {
    try {
      const userId = req.user.userId;
      return await this.userRulesManagementService.deleteRule(ruleId, userId);
    } catch (error) {
      throw error;
    }
  }
}
