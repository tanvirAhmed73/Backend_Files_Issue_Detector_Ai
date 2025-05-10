import { Controller, Post, Body, UseGuards, Req, UseInterceptors, UploadedFiles, Get, Param, Delete, Res, Query } from '@nestjs/common';
import { AnalyzerInterfaceService } from './analyzer_interface.service';
import { CreateAnalyzerInterfaceDto } from './dto/create-analyzer_interface.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CreateRuleManagementDto } from '../admin/rule-management/dto/create-rule-management.dto';

@ApiTags('analyzer-interface')
@Controller('analyzer-interface')
export class AnalyzerInterfaceController {
  constructor(private readonly analyzerInterfaceService: AnalyzerInterfaceService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('file', 10))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({summary:"Store and analyze documents with rules"})
  async analyze(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('ruleIds') ruleIds: string,
  ) {
    try {
      const userId = req.user.userId;

      if (!files?.length || !ruleIds) {
        return {
          success: false,
          message: 'Files and rules are required.'
        };
      }

      // Check subscription and token availability
      const accessCheck = await this.analyzerInterfaceService.checkAnalysisAccess(userId);
      if (!accessCheck.canAnalyze) {
        return {
          success: false,
          message: accessCheck.message,
          subscription: accessCheck.subscription
        };
      }

      // Parse ruleIds from string to array
      const ruleIdsArray = ruleIds.split(',');
  
      // First store all documents
      const storedDocs = await Promise.all(
        files.map(file => 
          this.analyzerInterfaceService.storeDocument(userId, file)
        )
      );

      const results = [];
      let totalTokensUsed = 0;
  
      // Then analyze each stored document
      for (const doc of storedDocs) {
        const analysisResult = await this.analyzerInterfaceService.analyzeDocument(
          doc.id,
          ruleIdsArray
        );
        
        totalTokensUsed += analysisResult.tokensUsed;
        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          analyses: analysisResult.analyses,
          tokensUsed: analysisResult.tokensUsed
        });
      }

      // Calculate remaining tokens
      const tokensRemaining = accessCheck.tokensRemaining !== -1 ? 
        accessCheck.tokensRemaining - totalTokensUsed : 
        -1;

      return {
        success: true,
        message: 'Documents stored and analyzed successfully',
        data: {
          results,
          tokenUsage: {
            totalUsed: totalTokensUsed,
            remaining: tokensRemaining,
            subscription: accessCheck.subscription
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'An error occurred during analysis',
        error: {
          type: error.name,
          details: error.message
        }
      };
    }
  }


  @Get('analysis-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's document analysis history with results" })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAnalysisHistory(
    @Req() req: Request,
    @Query('search') search?: string
  ) {
    try {
      const userId = req.user.userId;
      const history = await this.analyzerInterfaceService.getAnalysisHistory(userId, search);
      
      return {
        success: true,
        message: 'Analysis history retrieved successfully',
        data: history
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve analysis history',
      };
    }
  }


  @Post('edit-rules/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Edit rules and reanalyze document" })
  async editRulesAndReanalyze(
    @Req() req: Request,
    @Param('documentId') documentId: string,
    @Body('rules') rules: { id: string, description: string }[],
  ) {
    try {
      const userId = req.user.userId;
      
      if (!rules?.length) {
        return {
          success: false,
          message: 'Rules are required for reanalysis.'
        };
      }

      const analysisResult = await this.analyzerInterfaceService.editRulesAndAnalyze(
        userId,
        documentId,
        rules
      );

      return {
        success: true,
        message: 'Rules updated',
        data: analysisResult
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update rules and reanalyze document',
      };
    }
  }

  @Delete('document/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a specific document" })
  async deleteDocument(
    @Req() req: Request,
    @Param('documentId') documentId: string,
  ) {
    try {
      const userId = req.user.userId;
      await this.analyzerInterfaceService.deleteDocument(userId, documentId);
      
      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete document',
      };
    }
  }

  @Get('document/:documentId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Download a specific document" })
  async downloadDocument(
    @Req() req: Request,
    @Param('documentId') documentId: string,
    @Res() res: Response
  ) {
    try {
      const userId = req.user.userId;
      const document = await this.analyzerInterfaceService.getDocumentForDownload(userId, documentId);
      
      // Get the file content as buffer
      const fileBuffer = Buffer.from(document.content, 'base64');
      
      // Set appropriate content type based on file type
      const contentType = this.getContentType(document.fileName);
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      // Send the file
      res.send(fileBuffer);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to download document',
      });
    }
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const contentTypeMap = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    
    return contentTypeMap[extension] || 'application/octet-stream';
  }

  @Post('rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a custom rule" })
  async createRule(
    @Req() req: Request,
    @Body() createRuleDto: CreateRuleManagementDto
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.analyzerInterfaceService.createCustomRule(userId, createRuleDto);
      
      return {
        success: true,
        message: 'Custom rule created successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create custom rule',
      };
    }
  }

 
  @Get('all-rules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get both user's custom rules and predefined admin rules" })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search rules by title or description' })
  async getAllRules(
    @Req() req: Request,
    @Query('search') search?: string
  ) {
    try {
      const userId = req.user.userId;
      const [userRules, predefinedRules] = await Promise.all([
        this.analyzerInterfaceService.getUserRules(userId, search),
        this.analyzerInterfaceService.getPredefinedRules(search)
      ]);
      
      return {
        success: true,
        message: 'Rules retrieved successfully',
        data: {
          userRules,
          adminRules: predefinedRules
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve rules',
      };
    }
  }

  
}

