import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async findAll(year?: number, month?: number, page: number = 1, limit: number = 10) {
    try {
      // Validate year and month
      const currentDate = new Date();
      const selectedYear = Number(year) || currentDate.getFullYear();
      const selectedMonth = Number(month) || currentDate.getMonth() + 1;

      if (selectedMonth < 1 || selectedMonth > 12) {
        throw new HttpException('Invalid month value', HttpStatus.BAD_REQUEST);
      }

      if (selectedYear < 2000 || selectedYear > currentDate.getFullYear() + 1) {
        throw new HttpException('Invalid year value', HttpStatus.BAD_REQUEST);
      }

      // Total Count section remains unchanged
      const totalUsers = await this.prisma.user.count();
      
      
      // Count rules added by admin
      const adminRules = await this.prisma.rule.count({
        where: {
          created_by: {
            type: 'admin'
          }
        }
      });
      // Count rules added by users
      const userRules = await this.prisma.rule.count({
        where: {
          created_by: {
            type: 'user'
          }
        }
      });

      // ####################################### Revenue ###########################################################
      const yearStart = new Date(selectedYear, 0, 1); // January 1st of selected year
      const yearEnd = new Date(selectedYear + 1, 0, 1); // January 1st of next year
      
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1); // First day of selected month
      let monthEnd = new Date(selectedYear, selectedMonth, 1); // First day of next month

      // Add this for weekly calculations
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(currentDate.getDate() - 7);

      
      // Documents Analyzed
      const analyzedDocuments = await this.prisma.analyzerDocument.count({
        where: {
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          },
          OR: [
            { analysis_result: { not: null } },
            { rule_analyses: { some: {} } }
          ]
        }
      });

      
      // Total Yearly Earnings
      const yearlyEarning = await this.prisma.paymentTransaction.aggregate({
        where: {
          created_at: {
            gte: yearStart,
            lt: yearEnd,
          },
          status: 'completed',
          amount: { not: null }  // Ensure amount exists
        },
        _sum: {
          amount: true
        }
      });


      // Monthly Revenue
      const monthlyRevenue = await this.prisma.paymentTransaction.aggregate({
        where: {
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          },
          status: 'completed',
          amount: { not: null }
        },
        _sum: {
          amount: true
        }
      });
      
      // Subscription Revenue by Type with debug
      const subscriptionRevenue = await Promise.all([
        'PAY_AS_YOU_GO',
        'BASIC',
        'PRO',
        'ENTERPRISE'
      ].map(async (type) => {
        const revenue = await this.prisma.paymentTransaction.aggregate({
          where: {
            created_at: {
              gte: monthStart,
              lt: monthEnd,
            },
            status: 'completed',
            amount: { not: null },
            package_type: type as SubscriptionType,
          },
          _sum: {
            amount: true
          }
        });
        return { type, revenue: revenue._sum.amount || 0 };
      }));
      
      // Weekly Income with debug
      const weeklyIncome = await this.prisma.paymentTransaction.aggregate({
        where: {
          created_at: {
            gte: sevenDaysAgo,
            lte: currentDate,
          },
          status: 'completed',
          amount: { not: null }
        },
        _sum: {
          amount: true
        }
      });

      // User status using subsctiption
      const activeUsers = await this.prisma.subscription.count({
        where: {
          is_active: true,
          end_date: {
            gt: new Date()
          }
        }
      });

      const expiredUsers = await this.prisma.subscription.count({
        where: {
          end_date: {
            lt: new Date()
          },
          canceled_at: null
        }
      });

      const canceledUsers = await this.prisma.subscription.count({
        where: {
          canceled_at: {
            not: null
          }
        }
      });

      // ################################### API Usage################################################################
      // Get token usage statistics
      // const tokenStats = await this.prisma.tokenUsage.aggregate({
      //   _sum: {
      //     total_tokens: true,
      //     used_tokens: true,
      //   }
      // });

      // const totalTokens = tokenStats._sum.total_tokens || 0;
      // const usedTokens = tokenStats._sum.used_tokens || 0;
      // const remainingTokens = totalTokens - usedTokens;

      // Monthly token usage
      // const monthlyTokenUsage = await this.prisma.tokenUsage.aggregate({
      //   where: {
      //     created_at: {
      //       gte: monthStart,
      //       lt: monthEnd,
      //     }
      //   },
      //   _sum: {
      //     used_tokens: true,
      //   }
      // });

      // Get subscription counts by type
      const subscriptionCounts = await Promise.all([
        'PAY_AS_YOU_GO',
        'BASIC',
        'PRO',
        'ENTERPRISE'
      ].map(async (type) => {
        const count = await this.prisma.subscription.count({
          where: {
            type: type as any,
            is_active: true,
            end_date: {
              gt: new Date()
            }
          }
        });
        return { type, count };
      }));

      // Get top 5 most used admin rules
      const topAdminRules = await this.prisma.rule.findMany({
        where: {
          created_by: {
            type: 'admin'
          }
        },
        orderBy: {
          usage_count: 'desc'
        },
        take: 5,
        select: {
          title: true,
          usage_count: true
        }
      });

      // Get new users for current month with pagination
      const skip = (page - 1) * limit;
      const newUsers = await this.prisma.user.findMany({
        where: {
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          }
        },
        select: {
          name: true,
          email: true,
          subscriptions: {
            where: {
              is_active: true
            },
            select: {
              type: true
            },
            take: 1
          }
        },
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      });

      // Get total count for pagination
      const totalNewUsers = await this.prisma.user.count({
        where: {
          created_at: {
            gte: monthStart,
            lt: monthEnd,
          }
        }
      });

      // Get daily sales for each plan type
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const dailyPlanSales = await Promise.all([
        'PAY_AS_YOU_GO',
        'BASIC',
        'PRO',
        'ENTERPRISE'
      ].map(async (planType) => {
        const dailySales = await Promise.all(
          Array.from({ length: daysInMonth }, (_, i) => i + 1).map(async (day) => {
            const dayStart = new Date(selectedYear, selectedMonth - 1, day);
            const dayEnd = new Date(selectedYear, selectedMonth - 1, day + 1);
            
            const revenue = await this.prisma.paymentTransaction.aggregate({
              where: {
                created_at: {
                  gte: dayStart,
                  lt: dayEnd,
                },
                status: 'completed',
                amount: { not: null },
                package_type: planType as SubscriptionType
              },
              _sum: {
                amount: true
              }
            });

            return {
              date: dayStart.toISOString().split('T')[0],
              amount: revenue._sum.amount || 0
            };
          })
        );

        return {
          plan: planType,
          dailySales
        };
      }));

      return {
        totalUsers,
        analyzedDocuments,
        adminRules,
        userRules,
        revenue: {
          year: selectedYear,
          month: selectedMonth,
          yearlyEarning: yearlyEarning._sum.amount || 0,
          monthlyRevenue: monthlyRevenue._sum.amount || 0,
          subscriptionRevenue: {
            payAsYouGo: subscriptionRevenue[0].revenue,
            basic: subscriptionRevenue[1].revenue,
            pro: subscriptionRevenue[2].revenue,
            enterprise: subscriptionRevenue[3].revenue,
          },
          weeklyIncome: weeklyIncome._sum.amount || 0,
          dailyPlanSales
        },
        userStatus: {
          activeUsers,
          expiredUsers,
          canceledUsers,
        },
        // tokenUsage: {
        //   totalTokens,
        //   usedTokens,
        //   remainingTokens,
        //   monthlyUsage: (monthlyTokenUsage[0]._sum.tokens_used || 0) + 
        //                (monthlyTokenUsage[1]._sum.total_tokens || 0)
        // },
        subscriptionStatistics: {
          payAsYouGo: subscriptionCounts[0].count,
          basic: subscriptionCounts[1].count,
          pro: subscriptionCounts[2].count,
          enterprise: subscriptionCounts[3].count
        },
        mostUsagePreDefinedRules: topAdminRules,
        newUsers: {
          data: newUsers.map(user => ({
            name: user.name,
            email: user.email,
            subscription: user.subscriptions[0]?.type || 'NO_SUBSCRIPTION'
          })),
          pagination: {
            total: totalNewUsers,
            page,
            limit,
            totalPages: Math.ceil(totalNewUsers / limit)
          }
        }
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
