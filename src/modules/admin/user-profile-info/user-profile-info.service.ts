import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserProfileInfoService {
  constructor(private prisma: PrismaService) {}

  async findOneByID(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          first_name: true,
          last_name: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              analyzer_documents: true,
              created_rules: true,
            }
          },
          subscriptions: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              type: true,
              is_active: true,
              canceled_at: true,
              end_date: true,
              payment_transactions: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: {
                  amount: true,
                  currency: true,
                  created_at: true,
                  status: true,
                  provider: true,
                  package_type: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const currentSubscription = user.subscriptions[0];
      
      return {
        personal_info: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
        },
        user_information: {
          user_id: user.id,
          registration_date: user.created_at,
          last_active: user.updated_at,
          documents_analyzed: user._count.analyzer_documents,
          custom_rules: user._count.created_rules,
          subscription: currentSubscription ? {
            plan: currentSubscription.type,
            status: currentSubscription.canceled_at ? 'Canceled' : 
                   currentSubscription.end_date && currentSubscription.end_date < new Date() ? 'Expired' : 
                   currentSubscription.is_active ? 'Active' : 'Inactive'
          } : null
        },
        billing_information: currentSubscription?.payment_transactions[0] ? {
          date: currentSubscription.payment_transactions[0].created_at,
          amount: `${currentSubscription.payment_transactions[0].amount} ${currentSubscription.payment_transactions[0].currency}`,
          method: currentSubscription.payment_transactions[0].provider,
          plan: currentSubscription.payment_transactions[0].package_type,
          billing_status: currentSubscription.is_active ? 'Active' : 'Inactive',
          payment_status: currentSubscription.payment_transactions[0].status
        } : null
      };
    } catch (error) {
      throw error;
    }
  }
}
