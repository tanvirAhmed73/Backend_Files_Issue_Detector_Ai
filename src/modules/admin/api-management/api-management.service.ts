import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateApiManagementDto } from './dto/create-api-management.dto';
import { UpdateApiManagementDto } from './dto/update-api-management.dto';

@Injectable()
export class ApiManagementService {
  constructor(private prisma: PrismaService) {}

  async getApiUsageOverview(userId: string, period: 'day' | 'month' = 'month') {
    const startDate = period === 'day' 
      ? new Date(new Date().setHours(0, 0, 0, 0))
      : new Date(new Date().setDate(1));

    const usage = await this.prisma.apiUsage.aggregate({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate
        }
      },
      _sum: {
        input_tokens: true,
        output_tokens: true,
        total_tokens: true,
        estimated_cost: true
      }
    });

    const subscription = await this.prisma.tokenUsage.findFirst({
      where: {
        user_id: userId,
        deleted_at: null
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const totalTokens = subscription?.total_tokens || 0;
    const tokensUsed = usage._sum.total_tokens || 0;
    const tokensRemaining = totalTokens - tokensUsed;
    const percentageRemaining = totalTokens > 0 ? (tokensRemaining / totalTokens) * 100 : 0;

    return {
      estimated_cost: usage._sum.estimated_cost || 0,
      total_token: totalTokens,
      tokens_remaining: tokensRemaining,
      tokens_remaining_percentage: Math.round(percentageRemaining),
      total_tokens_used: tokensUsed,
      input_token_usage: usage._sum.input_tokens || 0,
      output_token_usage: usage._sum.output_tokens || 0
    };
  }

  async trackApiUsage(userId: string, inputTokens: number, outputTokens: number, estimatedCost: number) {
    return this.prisma.apiUsage.create({
      data: {
        user_id: userId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        estimated_cost: estimatedCost
      }
    });
  }

  async getDailyUsage(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1); // Month is 0-based in Date constructor
    const endDate = new Date(year, month, 0); // Get last day of month
    
    const dailyUsage = await this.prisma.apiUsage.groupBy({
      by: ['created_at'],
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        input_tokens: true,
        output_tokens: true
      }
    });
  
    // Create a map for all days in the month
    const daysInMonth = endDate.getDate();
    const usageMap = new Array(daysInMonth).fill(null).map((_, index) => ({
      day: index + 1,
      input_tokens: 0,
      output_tokens: 0
    }));
  
    // Fill in actual usage data
    dailyUsage.forEach(usage => {
      const day = new Date(usage.created_at).getDate();
      usageMap[day - 1] = {
        day,
        input_tokens: usage._sum.input_tokens || 0,
        output_tokens: usage._sum.output_tokens || 0
      };
    });
  
    const totalInput = usageMap.reduce((sum, day) => sum + day.input_tokens, 0);
    const totalOutput = usageMap.reduce((sum, day) => sum + day.output_tokens, 0);
  
    return {
      daily_usage: usageMap,
      average_input: Math.round(totalInput / daysInMonth),
      average_output: Math.round(totalOutput / daysInMonth)
    };
  }

  async getUserUsages(page: number, limit: number, year: number, month: number) {
    const skip = (page - 1) * limit;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
  
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where: {
          deleted_at: null
        },
        select: {
          id: true,
          email: true,
          subscriptions: {
            where: {
              is_active: true,
              end_date: {
                gte: new Date()
              }
            },
            select: {
              type: true  // Changed from plan_type to type
            }
          },
          api_usages: {
            where: {
              created_at: {
                gte: startDate,
                lte: endDate
              }
            },
            select: {
              total_tokens: true
            }
          }
        }
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null
        }
      })
    ]);
  
    const formattedUsers = users.map((user, index) => ({
      sl: skip + index + 1,
      user_id: user.id,
      email: user.email,
      total_api_calls: user.api_usages.length,
      token_used: user.api_usages.reduce((sum, usage) => sum + (usage.total_tokens || 0), 0),
      plan_type: user.subscriptions[0]?.type || 'As Pay You Go'  // Changed from plan_type to type
    }));
  
    return {
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      }
    };
  }
}
