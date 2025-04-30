import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { UserRepository } from 'src/common/repository/user/user.repository';
import { Role } from 'src/common/guard/role/role.enum';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async findAll(user_id: string) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);
      if (!userDetails) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const where_condition: any = {};

      if (userDetails.type === Role.ADMIN) {
        where_condition['OR'] = [
          { user_id: user_id },
          { is_admin: true }
        ];
      } else if (userDetails.type === Role.VENDOR) {
        where_condition['user_id'] = user_id;
      }

      const notifications = await this.prisma.userNotification.findMany({
        where: where_condition,
        select: {
          id: true,
          user_id: true,
          type: true,
          message: true,
          created_at: true,
          read: true,
          read_at: true,
          data: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Add avatar URLs
      return {
        success: true,
        data: notifications.map(notification => ({
          ...notification,
          user: notification.user ? {
            ...notification.user,
            avatar_url: notification.user.avatar ? 
              SojebStorage.url(appConfig().storageUrl.avatar + notification.user.avatar) : null
          } : null
        }))
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch notifications',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async remove(id: string, user_id: string) {
    try {
      const notification = await this.prisma.userNotification.findUnique({
        where: { id }
      });

      if (!notification) {
        throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.userNotification.delete({
        where: { id }
      });

      return {
        success: true,
        message: 'Notification deleted successfully'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete notification',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async removeAll(user_id: string) {
    try {
      const result = await this.prisma.userNotification.deleteMany({
        where: {
          OR: [
            { user_id: user_id },
            { is_admin: true }
          ]
        }
      });

      if (result.count === 0) {
        throw new HttpException('No notifications found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: 'All notifications deleted successfully'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete notifications',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
