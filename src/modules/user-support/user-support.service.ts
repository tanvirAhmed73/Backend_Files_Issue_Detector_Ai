import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserSupportDto } from './dto/create-user-support.dto';
import { UpdateUserSupportDto } from './dto/update-user-support.dto';
import { UserNotificationService } from '../user-notification/user-notification.service';

interface ServiceResponse {
  success: boolean;
  message?: string;
  data?: any;
}

@Injectable()
export class UserSupportService {
  constructor(
    private prisma: PrismaService,
    private userNotificationService: UserNotificationService
  ) {}

  async create(userId: string, createUserSupportDto: CreateUserSupportDto): Promise<ServiceResponse> {
    try {
      const ticketId = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const ticket = await this.prisma.userSupport.create({
        data: {
          ticket_id: ticketId,
          user_id: userId,
          subject: createUserSupportDto.subject,
          description: createUserSupportDto.description,
          messages: {
            create: {
              content: createUserSupportDto.description,
              sender_id: userId,
              is_from_user: true
            }
          }
        },
        include: {
          messages: true,
          user: true
        }
      });

      // In create method
      await this.prisma.userNotification.create({
        data: {
          user_id: userId,
          type: 'SUPPORT_TICKET_CREATED',
          message: `New support ticket created: ${ticket.subject}`,
          is_admin: true,
          data: {
            ticket_id: ticket.id,
            subject: ticket.subject
          }
        }
      });

      return {
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create support ticket'
      };
    }
  }

  async findAll(userId: string): Promise<ServiceResponse> {
    try {
      const tickets = await this.prisma.userSupport.findMany({
        where: {
          user_id: userId,
          deleted_at: null
        },
        include: {
          messages: {
            orderBy: {
              created_at: 'asc'
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return {
        success: true,
        data: tickets
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch support tickets'
      };
    }
  }

  async findOne(userId: string, id: string): Promise<ServiceResponse> {
    try {
      const ticket = await this.prisma.userSupport.findFirst({
        where: {
          id,
          user_id: userId,
          deleted_at: null
        },
        include: {
          messages: {
            orderBy: {
              created_at: 'asc'
            }
          }
        }
      });

      if (!ticket) {
        return {
          success: false,
          message: 'Support ticket not found'
        };
      }

      return {
        success: true,
        data: ticket
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch support ticket'
      };
    }
  }

  async addMessage(ticketId: string, userId: string, content: string): Promise<ServiceResponse> {
    try {
      const ticket = await this.prisma.userSupport.findFirst({
        where: { 
          id: ticketId,
          deleted_at: null
        },
        include: {
          user: true
        }
      });

      if (!ticket) {
        return {
          success: false,
          message: 'Support ticket not found'
        };
      }

      const message = await this.prisma.supportMessage.create({
        data: {
          content,
          sender_id: userId,
          support_ticket_id: ticketId,
          is_from_user: true
        }
      });

      // Update ticket status and last message time
      await this.prisma.userSupport.update({
        where: { id: ticketId },
        data: { 
          last_message_at: new Date(),
          status: 'PENDING'
        }
      });

      // In addMessage method
      await this.prisma.userNotification.create({
        data: {
          user_id: userId,
          type: 'SUPPORT_TICKET_UPDATED',
          message: `New message in support ticket #${ticket.ticket_id}`,
          is_admin: true,
          data: {
            ticket_id: ticketId,
            subject: ticket.subject
          }
        }
      });

      return {
        success: true,
        message: 'Message added successfully',
        data: message
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to add message'
      };
    }
  }
}
