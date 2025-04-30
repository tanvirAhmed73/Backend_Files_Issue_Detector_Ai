import { Injectable } from '@nestjs/common';
import { CreateUserRulesManagementDto } from './dto/create-user_rules_management.dto';
import { UpdateUserRulesManagementDto } from './dto/update-user_rules_management.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRulesManagementService {
  constructor(private prisma: PrismaService) {}

  async findAllByUserId(userId: string) {
    try {
      const rules = await this.prisma.rule.findMany({
        where: {
          created_by_id: userId,
          deleted_at: null,
          status: 1
        },
        include: {
          created_by: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true
            }
          },
          sub_rules: {
            where: {
              deleted_at: null,
              status: 1
            },
            select: {
              id: true,
              title: true,
              description: true,
              usage_count: true,
              is_draft: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return {
        success: true,
        data: rules,
        message: 'Rules retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve rules',
        error: error.message
      };
    }
  }

  async findOneByUserId(ruleId: string, userId: string) {
    try {
      const rule = await this.prisma.rule.findFirst({
        where: {
          id: ruleId,
          created_by_id: userId,
          deleted_at: null,
          status: 1
        },
        include: {
          created_by: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true
            }
          },
          sub_rules: {
            where: {
              deleted_at: null,
              status: 1
            },
            select: {
              id: true,
              title: true,
              description: true,
              usage_count: true,
              is_draft: true
            }
          },
          rule_analyses: {
            include: {
              document: true
            }
          }
        }
      });
  
      if (!rule) {
        return {
          success: false,
          message: 'Rule not found or you do not have permission to view it'
        };
      }
  
      return {
        success: true,
        data: rule,
        message: 'Rule retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve rule',
        error: error.message
      };
    }
  }

  async updateRule(ruleId: string, updateDto: UpdateUserRulesManagementDto, userId: string) {
    try {
      const existingRule = await this.prisma.rule.findFirst({
        where: {
          id: ruleId,
          created_by_id: userId,
          deleted_at: null,
          status: 1
        }
      });
  
      if (!existingRule) {
        return {
          success: false,
          message: 'Rule not found or you do not have permission to update it'
        };
      }
  
      const updatedRule = await this.prisma.rule.update({
        where: {
          id: ruleId
        },
        data: {
          title: updateDto.title ?? existingRule.title,
          description: updateDto.description ?? existingRule.description,
          is_draft: updateDto.is_draft ?? existingRule.is_draft,
          status: 1,
          updated_by_id: userId,
          updated_at: new Date(),
          last_modified: new Date(),
          published_date: updateDto.is_draft ? null : new Date(),
          usage_count: existingRule.usage_count // Preserve the existing usage count
        },
        include: {
          created_by: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true
            }
          },
          rule_analyses: {
            include: {
              document: true
            }
          },
          sub_rules: true
        }
      });
  
      return {
        success: true,
        data: updatedRule,
        message: 'Rule updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update rule',
        error: error.message
      };
    }
  }

  async deleteRule(ruleId: string, userId: string) {
    try {
      const existingRule = await this.prisma.rule.findFirst({
        where: {
          id: ruleId,
          created_by_id: userId,
          deleted_at: null,
          status: 1
        }
      });
  
      if (!existingRule) {
        return {
          success: false,
          message: 'Rule not found or you do not have permission to delete it'
        };
      }
  
      // Soft delete the rule
      await this.prisma.rule.update({
        where: {
          id: ruleId
        },
        data: {
          deleted_at: new Date(),
          status: 0,
          updated_by_id: userId,
          updated_at: new Date()
        }
      });
  
      return {
        success: true,
        message: 'Rule deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete rule',
        error: error.message
      };
    }
  }
}
