import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserManagementDto } from './dto/create-user-management.dto';
import { UpdateUserManagementDto } from './dto/update-user-management.dto';

@Injectable()
export class UserManagementService {
  constructor(private prisma: PrismaService) {}

  async findAll({
    filter: {
      limit,
      page,
      year,
      month,
      search,
      plan,
      status
    }
  }) {
    try {
      const currentDate = new Date();
      const selectedYear = year || currentDate.getFullYear();
      const selectedMonth = month || currentDate.getMonth() + 1;

      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

      const whereCondition = {
        ...(year || month ? {
          created_at: {
            gte: startDate,
            lte: endDate
          }
        } : {}),
        ...(search ? {
          OR: [
            {
              email: {
                contains: search,
                mode: 'insensitive' as const
              }
            },
            {
              username: {
                contains: search,
                mode: 'insensitive' as const
              }
            },
            {
              first_name: {
                contains: search,
                mode: 'insensitive' as const
              }
            },
            {
              last_name: {
                contains: search,
                mode: 'insensitive' as const
              }
            }
          ]
        } : {}),
        ...(plan ? {
          subscriptions: {
            some: {
              type: plan,
              is_active: true
            }
          }
        } : {}),
        ...(status ? {
          subscriptions: {
            some: {
              ...(status === 'ACTIVE' ? 
                { is_active: true, canceled_at: null } : 
                { canceled_at: { not: null } }
              )
            }
          }
        } : {})
      };

      const users = await this.prisma.user.findMany({
        where: whereCondition,
        take: limit || 12,
        skip: page ? (page - 1) * (limit || 12) : 0,
        select: {
          id: true,
          username: true,
          email: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              analyzer_documents: true,
              created_rules: true
            }
          },
          subscriptions: {
            take: 1,
            orderBy: {
              created_at: 'desc'
            },
            select: {
              type: true,
              billing_cycle: true,
              is_active: true,
              canceled_at: true,
              end_date: true
            }
          }
        }
      });

      const totalUsers = await this.prisma.user.count({
        where: whereCondition
      });

      const formattedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        registration_date: user.created_at,
        last_active: user.updated_at,
        documents_analyzed: user._count.analyzer_documents,
        custom_rules: user._count.created_rules,
        subscription: user.subscriptions[0] ? {
          plan: user.subscriptions[0].type,
          billing_cycle: user.subscriptions[0].billing_cycle,
          status: user.subscriptions[0].canceled_at ? 'Canceled' : 
                 user.subscriptions[0].end_date && user.subscriptions[0].end_date < new Date() ? 'Expired' : 
                 user.subscriptions[0].is_active ? 'Active' : 'Inactive'
        } : null
      }));

      return {
        data: formattedUsers,
        meta: {
          total: totalUsers,
          page: page || 1,
          limit: limit || 12,
          total_pages: Math.ceil(totalUsers / (limit || 12))
        }
      };
    } catch (error) {
      throw error;
    }
  }
}
