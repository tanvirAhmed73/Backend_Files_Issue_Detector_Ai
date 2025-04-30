import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenLimit } from '@prisma/client';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { CreateRuleManagementDto } from '../admin/rule-management/dto/create-rule-management.dto';
import { ApiManagementService } from '../admin/api-management/api-management.service';
import { getTokenLimit, TOKEN_LIMITS, formatTokenAmount } from '../../config/token-limits.config';

@Injectable()
export class AnalyzerInterfaceService {
  private openai: OpenAI;
  private MAX_CHUNK_SIZE = 8000;          

  constructor(
    private prisma: PrismaService,
    private apiManagementService: ApiManagementService  // Add this
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async storeDocument(userId: string, file: Express.Multer.File) {
    return await this.prisma.analyzerDocument.create({
      data: {
        user: {
          connect: {
            id: userId
          }
        },
        file_name: file.originalname,
        file_path: `documents/${userId}/${file.originalname}`,
        file_content: file.buffer.toString('base64'),
        type: this.getFileType(file.mimetype),
        status: 1
      }
    });
  }

  private getFileType(mimetype: string): string {
    const mimeTypeMap = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
    };

    return mimeTypeMap[mimetype] || 'document';
  }

  private async updateTokenUsage(userId: string, tokensUsed: number, subscriptionId?: string) {
    // If no subscription ID, this is a free analysis
    if (!subscriptionId) {
      return;
    }

    await this.prisma.tokenUsage.updateMany({
      where: {
        user_id: userId,
        subscription_id: subscriptionId,
        deleted_at: null
      },
      data: {
        tokens_used: {
          increment: tokensUsed
        }
      }
    });
  }

  private calculateTokensForAnalysis(textLength: number, numRules: number): number {
    // Calculate input tokens (text length / 4 is a rough estimate for token count)
    const inputTokens = Math.ceil(textLength / 4);
    
    // Calculate output tokens (estimate based on rules and response format)
    const outputTokens = numRules * 100; // Estimate 100 tokens per rule response
    
    return inputTokens + outputTokens;
  }

  async analyzeDocument(documentId: string, ruleIds: string[]) {
    const document = await this.prisma.analyzerDocument.findUnique({
      where: { id: documentId },
      include: {
        user: {
          include: {
            subscriptions: {
              where: {
                is_active: true
              }
            }
          }
        }
      }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const rules = await this.prisma.rule.findMany({
      where: {
        id: { in: ruleIds }
      },
      select: {
        id: true,
        title: true,
        description: true
      }
    });

    // Calculate estimated tokens needed
    const fileContent = Buffer.from(document.file_content, 'base64').toString('utf-8');
    const estimatedTokens = this.calculateTokensForAnalysis(fileContent.length, rules.length);

    // Check if user has enough tokens
    const accessCheck = await this.checkAnalysisAccess(document.user_id);
    if (!accessCheck.canAnalyze) {
      throw new Error(accessCheck.message);
    }

    if (accessCheck.tokensRemaining !== -1 && estimatedTokens > accessCheck.tokensRemaining) {
      throw new Error(`Insufficient tokens. Analysis requires approximately ${estimatedTokens} tokens, but you only have ${accessCheck.tokensRemaining} tokens remaining.`);
    }

    // Parse the file content based on document type
    let fileContentParsed: string;
    const decodedBuffer = Buffer.from(document.file_content, 'base64');
    
    switch (document.type) {
      case 'pdf':
        const pdfData = await pdfParse(decodedBuffer);
        fileContentParsed = pdfData.text;
        break;
      case 'doc':
      case 'docx':
        const result = await mammoth.extractRawText({ buffer: decodedBuffer });
        fileContentParsed = result.value;
        break;
      default:
        fileContentParsed = decodedBuffer.toString('utf-8');
    }

    const chunks = this.chunkText(fileContentParsed);
    const results = [];

    const ruleList = rules.map(rule => rule.description); // Add this line to create ruleList

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    
    for (const rule of rules) {
      let chunkAnalyses = [];
      
      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo-16k",
          messages: [
            {
              role: "system",
              content: `You are a document analysis expert.

                You will receive:
                - A document.
                - A set of numbered rules or questions.

                Your job is to answer each rule clearly and accurately based only on the content of the document.

                ⚠️ Format your response **strictly** like this:

                Rule 1:  
                [Matched | Not Matched]: [Explanation or direct quote from the document]  

                Rule 2:  
                [Matched | Not Matched]: [Explanation or direct quote from the document]  

                ... and so on.

                📝 Guidelines:
                - If the document supports the rule clearly, mark it "Matched" and quote or summarize the evidence.
                - If not, mark it "Not Matched" and explain what's missing.
                - Be specific. Do NOT say both "Matched" and "Not Matched" for the same rule.
                - Keep it concise and structured.`
            },
            {
              role: "user",
              content: `
                  Document:  
                  """  
                  ${chunk}  
                  """

                  Rules:  
                  ${ruleList.map((r, index) => `${index + 1}. ${r}`).join('\n')}
                  `
            }
          ],
          temperature: 0.2,
          max_tokens: 500
        });

        // Track tokens for each chunk analysis
        totalInputTokens += completion.usage.prompt_tokens;
        totalOutputTokens += completion.usage.completion_tokens;

        chunkAnalyses.push(completion.choices[0].message.content);
      }

      const finalCompletion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            role: "system",
            content: `You are a document analysis expert.

                      You will receive:
                      - Previous analyses of document chunks
                      - A set of numbered rules or questions.

                      Your job is to provide a final conclusion for each rule based on all analyses.

                      ⚠️ Format your response **strictly** like this:

                      Rule 1:  
                      [Matched | Not Matched]: [Final conclusion with supporting evidence]  

                      Rule 2:  
                      [Matched | Not Matched]: [Final conclusion with supporting evidence]  

                      ... and so on.

                      📝 Guidelines:
                      - Combine evidence from all chunks
                      - If any chunk supports the rule clearly, mark it "Matched"
                      - If no chunks support the rule, mark it "Not Matched"
                      - Be specific. Do NOT say both "Matched" and "Not Matched" for the same rule.
                      - Keep it concise and structured.`
          },
          {
            role: "user",
            content: `
                  Previous Analyses:
                  """
                  ${chunkAnalyses.join('\n\n')}
                  """

                  Rules:
                  ${ruleList.map((r, index) => `${index + 1}. ${r}`).join('\n')}
                              `
                            }
                          ],
                          temperature: 0.2,
        max_tokens: 500
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const analysis = finalCompletion.choices[0].message.content;
      const isMatched = analysis.toLowerCase().startsWith("matched:") && 
                       !analysis.toLowerCase().startsWith("not matched:");
      
      results.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        matched: isMatched,
        analysis: analysis
      });
    }

    // Store analysis results
    await this.prisma.ruleAnalysis.createMany({
      data: results.map(result => ({
        document_id: documentId,
        rule_id: result.ruleId,
        result: result.analysis
      }))
    });

    // Calculate estimated cost (based on GPT-3.5-turbo pricing)
    const inputCost = (totalInputTokens / 1000) * 0.0015;  // $0.0015 per 1K input tokens
    const outputCost = (totalOutputTokens / 1000) * 0.002;  // $0.002 per 1K output tokens
    const estimatedCost = inputCost + outputCost;

    // Track API usage
    await this.apiManagementService.trackApiUsage(
      document.user_id,
      totalInputTokens,
      totalOutputTokens,
      estimatedCost
    );

    // After successful analysis, update token usage
    const actualTokensUsed = totalInputTokens + totalOutputTokens;
    await this.updateTokenUsage(
      document.user_id,
      actualTokensUsed,
      document.user.subscriptions[0]?.id
    );

    return {
      documentId: documentId,
      fileName: document.file_name,
      analyses: results,
      tokensUsed: actualTokensUsed,
      tokensRemaining: accessCheck.tokensRemaining !== -1 ? 
        accessCheck.tokensRemaining - actualTokensUsed : 
        -1
    };
  }

  private chunkText(text: string): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const word of words) {
      if ((currentChunk + word).length < this.MAX_CHUNK_SIZE) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  }

  async getAnalysisHistory(userId: string, search?: string) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
  
      const last7days = new Date(today);
      last7days.setDate(last7days.getDate() - 7);
  
      const baseQuery = {
        user_id: userId,
        deleted_at: null,
        ...(search ? {
          file_name: {
            contains: search,
            mode: 'insensitive' as const
          }
        } : {})
      };
  
      // Get today's data
      const todayData = await this.prisma.analyzerDocument.findMany({
        where: {
          ...baseQuery,
          created_at: {
            gte: today
          }
        },
        select: {
          id: true,
          file_name: true,
          type: true,
          created_at: true,
          rule_analyses: {
            include: {
              rule: {
                select: {
                  id: true,
                  title: true,
                  description: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
  
      // Get yesterday's data
      const yesterdayData = await this.prisma.analyzerDocument.findMany({
        where: {
          ...baseQuery,
          created_at: {
            gte: yesterday,
            lt: today
          }
        },
        select: {
          id: true,
          file_name: true,
          type: true,
          created_at: true,
          rule_analyses: {
            include: {
              rule: {
                select: {
                  id: true,
                  title: true,
                  description: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
  
      // Get last 7 days data
      const last7DaysData = await this.prisma.analyzerDocument.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
          created_at: {
            gte: last7days
          }
        },
        select: {
          id: true,
          file_name: true,
          type: true,
          created_at: true,
          rule_analyses: {
            include: {
              rule: {
                select: {
                  id: true,
                  title: true,
                  description: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
  
      const formatDocuments = (docs) => docs.map(doc => ({
        document: {
          id: doc.id,
          fileName: doc.file_name,
          type: doc.type,
          analyzedAt: doc.created_at
        },
        analyses: doc.rule_analyses.map(analysis => ({
          ruleId: analysis.rule.id,
          ruleTitle: analysis.rule.title,
          ruleDescription: analysis.rule.description,
          result: analysis.result,
          matched: analysis.result.toLowerCase().startsWith("matched:") && 
                   !analysis.result.toLowerCase().startsWith("not matched:")
        }))
      }));
  
      return {
        todayData: formatDocuments(todayData),
        yesterday: formatDocuments(yesterdayData),
        last7days: formatDocuments(last7DaysData)
      };
    }

  // async getUserAnalysisHistory(userId: string) {
  //   const documents = await this.prisma.analyzerDocument.findMany({
  //     where: {
  //       user_id: userId,
  //       deleted_at: null
  //     },
  //     select: {
  //       id: true,
  //       file_name: true,
  //       type: true,
  //       created_at: true,
  //       rule_analyses: {
  //         include: {
  //           rule: {
  //             select: {
  //               id: true,
  //               title: true,
  //               description: true
  //             }
  //           }
  //         }
  //       }
  //     },
  //     orderBy: {
  //       created_at: 'desc'
  //     }
  //   });
  
  //   return documents.map(doc => ({
  //     document: {
  //       id: doc.id,
  //       fileName: doc.file_name,
  //       type: doc.type,
  //       analyzedAt: doc.created_at
  //     },
  //     analyses: doc.rule_analyses.map(analysis => ({
  //       ruleId: analysis.rule.id,
  //       ruleTitle: analysis.rule.title,
  //       ruleDescription: analysis.rule.description,
  //       result: analysis.result,
  //       matched: analysis.result.toLowerCase().startsWith("matched:") && 
  //                !analysis.result.toLowerCase().startsWith("not matched:")
  //     }))
  //   }));
  // }

  async deleteDocument(userId: string, documentId: string) {
    const document = await this.prisma.analyzerDocument.findFirst({
      where: {
        id: documentId,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // Soft delete the document
    await this.prisma.analyzerDocument.update({
      where: { id: documentId },
      data: { deleted_at: new Date() }
    });
  }

  async getDocumentForDownload(userId: string, documentId: string) {
    const document = await this.prisma.analyzerDocument.findFirst({
      where: {
        id: documentId,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    return {
      fileName: document.file_name,
      content: document.file_content
    };
  }

  async editRulesAndAnalyze(
    userId: string,
    documentId: string,
    rules: { id: string, description: string }[]
  ) {
    // First verify document access
    const document = await this.prisma.analyzerDocument.findFirst({
      where: {
        id: documentId,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // Get user's role
    const userRole = await this.prisma.roleUser.findFirst({
      where: { user_id: userId },
      include: { role: true }
    });

    // Create or update rules
    const updatedRules = await Promise.all(
      rules.map(async rule => {
        const existingRule = await this.prisma.rule.findUnique({
          where: { id: rule.id },
          include: {
            created_by: {
              select: {
                role_users: {
                  include: { role: true }
                }
              }
            }
          }
        });

        if (existingRule) {
          // Check if rule was created by admin or if user is admin
          const isCreatorAdmin = existingRule.created_by?.role_users.some(ru => ru.role.name === 'admin');
          const isUserAdmin = userRole?.role.name === 'admin';

          if (!isCreatorAdmin && !isUserAdmin && existingRule.created_by_id !== userId) {
            throw new Error('You can only update rules created by admin or yourself');
          }

          // Update existing rule
          return this.prisma.rule.update({
            where: { id: rule.id },
            data: { 
              description: rule.description,
              updated_by_id: userId,
              updated_at: new Date()
            }
          });
        } else {
          // Create new rule
          return this.prisma.rule.create({
            data: {
              id: rule.id,
              description: rule.description,
              title: 'Custom Rule',
              created_by_id: userId,
              updated_by_id: userId,
              status: 1,
              is_draft: false
            }
          });
        }
      })
    );

    // Reanalyze with updated rules
    const ruleIds = updatedRules.map(rule => rule.id);
    return this.analyzeDocument(documentId, ruleIds);
  }
  
  async createCustomRule(userId: string, createRuleDto: CreateRuleManagementDto) {
      // First verify the user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
  
      if (!user) {
        throw new Error('User not found');
      }
  
      const newRule = await this.prisma.rule.create({
        data: {
          title: createRuleDto.title,
          description: createRuleDto.description,
          published_date: new Date(),
          last_modified: new Date(),
          usage_count: 0,
          status: 1,
          is_draft: false,
          created_by: {
            connect: { id: userId }
          },
          updated_by: {
            connect: { id: userId }
          }
        }
      });
  
      return {
        id: newRule.id,
        title: newRule.title,
        description: newRule.description,
        published_date: newRule.published_date,
        last_modified: newRule.last_modified
      };
    }
  
  async getUserRules(userId: string, search?: string) {
      const rules = await this.prisma.rule.findMany({
        where: {
          created_by_id: userId,
          status: 1,
          deleted_at: null,
          ...(search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } }
            ]
          } : {})
        },
        select: {
          id: true,
          title: true,
          description: true,
          usage_count: true,
          published_date: true,
          last_modified: true
        },
        orderBy: {
          last_modified: 'desc'
        }
      });
  
      return rules;
    }
  
  async getPredefinedRules(search?: string) {
      const rules = await this.prisma.rule.findMany({
        where: {
          status: 1,
          deleted_at: null,
          created_by: {
            type: 'admin'
          },
          ...(search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } }
            ]
          } : {})
        },
        select: {
          id: true,
          title: true,
          description: true,
          usage_count: true,
          published_date: true,
          last_modified: true,
          created_by: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: {
          last_modified: 'desc'
        }
      });
  
      return rules.map(rule => ({
        id: rule.id,
        title: rule.title,
        description: rule.description,
      }));
    }


    async checkAnalysisAccess(userId: string) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: {
              is_active: true,
              end_date: {
                gte: new Date()
              }
            }
          }
        }
      });
  
      // Check for active subscription
      const activeSubscription = user.subscriptions[0];
      
      if (!activeSubscription) {
        // Check if user has used their free analysis
        const previousAnalysis = await this.prisma.analyzerDocument.findFirst({
          where: {
            user_id: userId,
            deleted_at: null
          }
        });
  
        if (!previousAnalysis) {
          return {
            canAnalyze: true,
            message: 'You can perform one free analysis. Subscribe to continue using the service after this analysis.',
            isFirstTimeAnalysis: true
          };
        }
  
        return {
          canAnalyze: false,
          message: 'Please subscribe to continue using the analysis feature. Your free analysis has been used.',
          tokensRemaining: 0,
          subscription: null
        };
      }
  
      // Get token usage for active subscription
      const tokenUsage = await this.prisma.tokenUsage.findFirst({
        where: {
          user_id: userId,
          subscription_id: activeSubscription.id,
          deleted_at: null
        }
      });
  
      if (!tokenUsage) {
        // Create new token usage record if it doesn't exist
        const totalTokens = getTokenLimit(activeSubscription.type);
        await this.prisma.tokenUsage.create({
          data: {
            user_id: userId,
            subscription_id: activeSubscription.id,
            total_tokens: totalTokens,
            tokens_used: 0,
            reset_date: this.calculateNextResetDate(activeSubscription.billing_cycle)
          }
        });
  
        return {
          canAnalyze: true,
          message: `New subscription activated with ${formatTokenAmount(totalTokens)} tokens`,
          tokensRemaining: totalTokens,
          subscription: {
            type: activeSubscription.type,
            totalTokens,
            description: TOKEN_LIMITS[activeSubscription.type].description
          }
        };
      }
  
      // For enterprise plan with unlimited tokens
      if (tokenUsage.total_tokens === -1) {
        return {
          canAnalyze: true,
          message: TOKEN_LIMITS[activeSubscription.type].description,
          tokensRemaining: -1,
          subscription: {
            type: activeSubscription.type,
            totalTokens: -1,
            description: TOKEN_LIMITS[activeSubscription.type].description
          }
        };
      }
  
      const tokensRemaining = tokenUsage.total_tokens - tokenUsage.tokens_used;
  
      if (tokensRemaining <= 0) {
        return {
          canAnalyze: false,
          message: `You have used all your tokens (${formatTokenAmount(tokenUsage.total_tokens)}). Please upgrade your subscription or wait for the next billing cycle.`,
          tokensRemaining: 0,
          subscription: {
            type: activeSubscription.type,
            totalTokens: tokenUsage.total_tokens,
            description: TOKEN_LIMITS[activeSubscription.type].description
          }
        };
      }
  
      return {
        canAnalyze: true,
        message: `Active subscription with ${formatTokenAmount(tokensRemaining)} tokens remaining`,
        tokensRemaining,
        subscription: {
          type: activeSubscription.type,
          totalTokens: tokenUsage.total_tokens,
          description: TOKEN_LIMITS[activeSubscription.type].description
        }
      };
    }

  private calculateNextResetDate(billingCycle: string): Date {
    const now = new Date();
    const resetDate = new Date(now);
    
    if (billingCycle === 'YEARLY') {
      resetDate.setFullYear(now.getFullYear() + 1);
    } else {
      // Default to monthly
      resetDate.setMonth(now.getMonth() + 1);
    }
    
    return resetDate;
  }

}

