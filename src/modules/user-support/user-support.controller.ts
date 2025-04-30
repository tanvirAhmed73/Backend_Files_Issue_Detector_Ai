import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { UserSupportService } from './user-support.service';
import { CreateUserSupportDto } from './dto/create-user-support.dto';
import { ServiceResponse } from './interfaces/service-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('user-support')
@Controller('user-support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSupportController {
  constructor(private readonly userSupportService: UserSupportService) {}

  @Post()
  async create(@Req() req, @Body() createUserSupportDto: CreateUserSupportDto): Promise<ServiceResponse> {
    const response = await this.userSupportService.create(req.user.userId, createUserSupportDto);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
    }
    return response;
  }

  @Get()
  async findAll(@Req() req): Promise<ServiceResponse> {
    const response = await this.userSupportService.findAll(req.user.userId);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return response;
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string): Promise<ServiceResponse> {
    const response = await this.userSupportService.findOne(req.user.userId, id);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.NOT_FOUND);
    }
    return response;
  }

  @Post(':id/messages')
  async addMessage(
    @Req() req,
    @Param('id') id: string,
    @Body('content') content: string
  ): Promise<ServiceResponse> {
    const response = await this.userSupportService.addMessage(id, req.user.userId, content);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
    }
    return response;
  }
}
