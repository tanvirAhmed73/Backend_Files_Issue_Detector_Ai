import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

interface ServiceResponse {
  success: boolean;
  message?: string;
  data?: any;
}

@Injectable()
export class UserNotificationService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    message: string,
    data?: Record<string, any>
  ): Promise<ServiceResponse> {
    try {
      const notification = await this.prisma.userNotification.create({
        data: {
          type,
          message,
          data: data || {},
          is_admin: data?.isAdminNotification || false,
          user: {
            connect: {
              id: userId
            }
          }
        }
      });
      return { success: true, data: notification };
    } catch (error) {
      return { success: false, message: 'Failed to create notification' };
    }
  }

  async findAll(userId: string): Promise<ServiceResponse> {
    try {
      const notifications = await this.prisma.userNotification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });
      return { success: true, data: notifications };
    } catch (error) {
      return { success: false, message: 'Failed to fetch notifications' };
    }
  }

  async getUnreadCount(userId: string): Promise<ServiceResponse> {
    try {
      const count = await this.prisma.userNotification.count({
        where: {
          user_id: userId,
          read: false
        }
      });
      return { success: true, data: { count } };
    } catch (error) {
      return { success: false, message: 'Failed to get unread count' };
    }
  }

  async markAsRead(userId: string, id: string): Promise<ServiceResponse> {
    try {
      const notification = await this.prisma.userNotification.updateMany({
        where: {
          id,
          user_id: userId
        },
        data: {
          read: true,
          read_at: new Date()
        }
      });
      return { success: true, data: notification };
    } catch (error) {
      return { success: false, message: 'Failed to mark notification as read' };
    }
  }

  async markAllAsRead(userId: string): Promise<ServiceResponse> {
    try {
      const result = await this.prisma.userNotification.updateMany({
        where: {
          user_id: userId,
          read: false
        },
        data: {
          read: true,
          read_at: new Date()
        }
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: 'Failed to mark all notifications as read' };
    }
  }
}
