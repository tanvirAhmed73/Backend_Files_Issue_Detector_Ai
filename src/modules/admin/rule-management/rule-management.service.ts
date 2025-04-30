import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateRuleManagementDto,
  RuleQueryDto,
} from './dto/create-rule-management.dto';
import { UpdateRuleManagementDto } from './dto/update-rule-management.dto';

@Injectable()
export class RuleManagementService {
  constructor(private prisma: PrismaService) {}

  async findAll({ page, limit, search, is_draft }: RuleQueryDto) {
    const _is_draft = Boolean(is_draft);
    try {
      const whereCondition = {
        status: 1,
        deleted_at: null,
        is_draft: _is_draft,
        ...(search
          ? {
              OR: [
                { id: search },
                { title: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [rules, totalRules] = await Promise.all([
        this.prisma.rule.findMany({
          where: whereCondition,
          select: {
            id: true,
            title: true,
            usage_count: true,
            is_draft: true,
            published_date: true,
            last_modified: true,
            created_by: {
              select: {
                username: true,
                email: true,
              },
            },
          },
          orderBy: {
            last_modified: 'desc',
          },
          take: limit || 12,
          skip: page ? (page - 1) * (limit || 12) : 0,
        }),
        this.prisma.rule.count({
          where: whereCondition, // Use the same whereCondition for count
        }),
      ]);

      return {
        data: rules.map((rule) => ({
          id: rule.id,
          rule_name: rule.title,
          usage_count: rule.usage_count,
          is_draft: rule.is_draft,
          published_date: rule.published_date,
          last_modified: rule.last_modified,
          created_by:
            rule.created_by?.username || rule.created_by?.email || 'Unknown',
        })),
        meta: {
          total: totalRules,
          page: page || 1,
          limit: limit || 12,
          total_pages: Math.ceil(totalRules / (limit || 12)),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.rule.update({
        where: { id },
        data: {
          status: 0,
          deleted_at: new Date(),
        },
      });

      return {
        message: 'Rule deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async create(
    createRuleManagementDto: CreateRuleManagementDto,
    userId: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { type: true },
      });

      if (!user || user.type !== 'admin') {
        throw new Error('Only admin users can create rules');
      }

      const newRule = await this.prisma.rule.create({
        data: {
          title: createRuleManagementDto.title,
          description: createRuleManagementDto.description,
          published_date: createRuleManagementDto.is_draft ? null : new Date(),
          last_modified: new Date(),
          usage_count: 0,
          status: 1,
          created_by_id: userId,
          updated_by_id: userId,
          is_draft: createRuleManagementDto.is_draft || false,
        },
      });

      return {
        message: createRuleManagementDto.is_draft
          ? 'Rule saved as draft'
          : 'Rule created successfully',
        data: {
          id: newRule.id,
          title: newRule.title,
          description: newRule.description,
          published_date: newRule.published_date,
          last_modified: newRule.last_modified,
          is_draft: newRule.is_draft,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async update(
    id: string,
    updateRuleManagementDto: UpdateRuleManagementDto,
    userId: string,
  ) {
    const updatedRule = await this.prisma.rule.update({
      where: { id },
      data: {
        ...updateRuleManagementDto,
        last_modified: new Date(),
        updated_by_id: userId,
      },
    });

    return {
      message: 'Rule updated successfully',
      data: {
        id: updatedRule.id,
        title: updatedRule.title,
        description: updatedRule.description,
        published_date: updatedRule.published_date,
        last_modified: updatedRule.last_modified,
      },
    };
  }

  async findOne(id: string) {
    try {
      const rule = await this.prisma.rule.findFirst({
        where: {
          id,
          status: 1,
          deleted_at: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          usage_count: true,
          published_date: true,
          last_modified: true,
          is_draft: true,
          created_by: {
            select: {
              username: true,
              email: true,
            },
          },
        },
      });

      if (!rule) {
        throw new Error('Rule not found');
      }

      return {
        data: {
          id: rule.id,
          rule_name: rule.title,
          description: rule.description,
          usage_count: rule.usage_count,
          published_date: rule.published_date,
          last_modified: rule.last_modified,
          is_draft: rule.is_draft,
          created_by:
            rule.created_by?.username || rule.created_by?.email || 'Unknown',
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
