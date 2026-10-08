import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { createImageUploadOptions } from '../../common/upload/multer-upload.util';
import { UserService } from './user.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SetUserSuspensionDto } from './dto/set-user-suspension.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List users with filters (admin only)' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.userService.listUsersForAdmin(query);
  }

  @Get(':id/details')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user details with profile data (admin only)' })
  @ApiResponse({ status: 200, description: 'User details retrieved' })
  getUserDetails(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.getUserDetailsForAdmin(id);
  }

  @Patch(':id/verify-email')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a user email (admin only)' })
  @ApiResponse({ status: 200, description: 'User email verified' })
  verifyUserEmail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.verifyUserEmailByAdmin(id);
  }

  @Patch(':id/suspension')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend or unsuspend user (admin only)' })
  @ApiResponse({ status: 200, description: 'User suspension status updated' })
  setUserSuspension(
    @CurrentUser() actor: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetUserSuspensionDto,
  ) {
    return this.userService.setUserSuspensionByAdmin(
      actor.id,
      id,
      dto.isActive,
    );
  }

  @Patch(':id/admin-edit')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit user profile fields (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  updateUserByAdmin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserByAdminDto,
  ) {
    return this.userService.updateUserByAdmin(id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user retrieved' })
  getMe(@CurrentUser() user: User) {
    return this.userService.sanitize(user);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user updated' })
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.userService.updateSelf(user.id, dto);
  }

  @Patch('me/photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('photo', createImageUploadOptions('profiles/photos')),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload profile photo for current authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Profile photo uploaded' })
  uploadMyPhoto(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          fileIsRequired: true,
          exceptionFactory: (error) => new BadRequestException(error),
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.userService.uploadMyPhoto(user.id, file.path);
  }
}
