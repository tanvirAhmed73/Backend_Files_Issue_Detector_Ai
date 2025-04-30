import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserProfileInfoService } from './user-profile-info.service';
import { CreateUserProfileInfoDto } from './dto/create-user-profile-info.dto';
import { UpdateUserProfileInfoDto } from './dto/update-user-profile-info.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';

@Controller('admin/user-profile-info')
export class UserProfileInfoController {
  constructor(private readonly userProfileInfoService: UserProfileInfoService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    try {
      return this.userProfileInfoService.findOneByID(id);
    } catch (error) {
      console.log(error);
    }
  }


}
