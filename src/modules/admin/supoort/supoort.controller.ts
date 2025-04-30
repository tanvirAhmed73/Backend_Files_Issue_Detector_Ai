import { Controller, Get, Post, Patch, Param, UseGuards, Body, Req, HttpException, HttpStatus } from '@nestjs/common';
import { SupoortService } from './supoort.service';
import { UpdateSupoortDto } from './dto/update-supoort.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceResponse } from './interfaces/service-response.interface';
import { AdminReplyDto } from './dto/admin-reply.dto';

@ApiTags('admin/support')
@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class SupoortController {
  constructor(private readonly supoortService: SupoortService) {}

  @Get()
  async findAll(): Promise<ServiceResponse> {
    const response = await this.supoortService.findAll();
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return response;
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ServiceResponse> {
    const response = await this.supoortService.findOne(id);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.NOT_FOUND);
    }
    return response;
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateSupoortDto: UpdateSupoortDto
  ): Promise<ServiceResponse> {
    const response = await this.supoortService.update(id, updateSupoortDto);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
    }
    return response;
  }

  @Post(':id/reply')
  async addReply(
    @Req() req,
    @Param('id') id: string,
    @Body() replyDto: AdminReplyDto
  ): Promise<ServiceResponse> {
    const response = await this.supoortService.addAdminReply(id, req.user.userId, replyDto);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
    }
    return response;
  }
}
