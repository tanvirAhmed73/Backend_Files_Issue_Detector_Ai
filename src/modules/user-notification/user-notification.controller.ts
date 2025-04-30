import { Controller, Get, Post, Param, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { UserNotificationService } from './user-notification.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceResponse } from './interfaces/service-response.interface';

@ApiTags('user-notification')
@Controller('user-notification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserNotificationController {
  constructor(private readonly userNotificationService: UserNotificationService) {}

  @Get()
  async findAll(@Req() req): Promise<ServiceResponse> {
    const response = await this.userNotificationService.findAll(req.user.userId);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return response;
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req): Promise<ServiceResponse> {
    const response = await this.userNotificationService.getUnreadCount(req.user.userId);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return response;
  }

  @Post(':id/read')
  async markAsRead(@Req() req, @Param('id') id: string): Promise<ServiceResponse> {
    const response = await this.userNotificationService.markAsRead(req.user.userId, id);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
    }
    return response;
  }

  @Post('mark-all-read')
  async markAllAsRead(@Req() req): Promise<ServiceResponse> {
    const response = await this.userNotificationService.markAllAsRead(req.user.userId);
    if (!response.success) {
      throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
    }
    return response;
  }
}
