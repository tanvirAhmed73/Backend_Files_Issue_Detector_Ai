import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSupoortDto } from './dto/update-supoort.dto';
import { ServiceResponse } from './interfaces/service-response.interface';
import { AdminReplyDto } from './dto/admin-reply.dto';
import { SupportStatus } from '@prisma/client';  // Add this import

@Injectable()
export class SupoortService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<ServiceResponse> {
    try {
      const tickets = await this.prisma.userSupport.findMany({
        where: {
          deleted_at: null
        },
        select: {
          id: true,
          ticket_id: true,
          subject: true,
          description: true,
          status: true,
          priority: true,
          created_at: true,
          updated_at: true,
          last_message_at: true,
          messages: {
            orderBy: {
              created_at: 'desc'
            },
            select: {
              id: true,
              content: true,
              created_at: true,
              is_from_user: true,
              sender: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          last_message_at: 'desc'
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

  async findOne(id: string): Promise<ServiceResponse> {
    try {
      const ticket = await this.prisma.userSupport.findFirst({
        where: { 
          id,
          deleted_at: null
        },
        include: {
          messages: {
            orderBy: {
              created_at: 'asc'
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true
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

  async update(id: string, updateSupoortDto: UpdateSupoortDto): Promise<ServiceResponse> {
    try {
      const ticket = await this.prisma.userSupport.update({
        where: { id },
        data: {
          status: updateSupoortDto.status,
          updated_at: new Date()
        }
      });

      return {
        success: true,
        message: 'Support ticket status updated successfully',
        data: ticket
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update support ticket status'
      };
    }
  } // Added missing closing brace here

  async addAdminReply(ticketId: string, adminId: string, replyDto: AdminReplyDto): Promise<ServiceResponse> {
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
          content: replyDto.content,
          sender_id: adminId,
          support_ticket_id: ticketId,
          is_from_user: false
        }
      });

      // Update ticket status and last message time
      await this.prisma.userSupport.update({
        where: { id: ticketId },
        data: { 
          last_message_at: new Date(),
          status: SupportStatus.PENDING
        }
      });

      // Create notification for user
      await this.prisma.userNotification.create({
        data: {
          user_id: ticket.user_id,
          type: 'SUPPORT_RESPONSE',
          message: `Admin replied to your ticket: ${ticket.ticket_id}`,
          data: {
            ticket_id: ticketId,
            subject: ticket.subject
          }
        }
      });

      return {
        success: true,
        message: 'Reply sent successfully',
        data: message
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send reply'
      };
    }
  }
}
