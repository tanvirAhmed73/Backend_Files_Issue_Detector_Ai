import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  ParseFilePipe,
  UploadedFiles,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WebsiteInfoService } from './website-info.service';
import { CreateWebsiteInfoDto } from './dto/create-website-info.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import appConfig from 'src/config/app.config';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Website Info')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/website-info')
export class WebsiteInfoController {
  constructor(private readonly websiteInfoService: WebsiteInfoService) {}

  @ApiOperation({ summary: 'Update website info' })
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'favicon', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination:
            appConfig().storageUrl.rootUrl + appConfig().storageUrl.websiteInfo,
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${file.originalname}`);
          },
        }),
      },
    ),
  )
  async create(
    @Req() req: Request,
    @Body() createWebsiteInfoDto: CreateWebsiteInfoDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
      }),
    )
    files: {
      logo?: Express.Multer.File;
      favicon?: Express.Multer.File;
    },
  ) {
    try {
      const websiteInfo = await this.websiteInfoService.create(
        createWebsiteInfoDto,
        files,
      );
      return websiteInfo;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get website info' })
  @Get()
  async findAll() {
    try {
      const websiteInfo = await this.websiteInfoService.findAll();
      return websiteInfo;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
