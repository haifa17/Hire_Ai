import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  ParseFilePipeBuilder,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';
import { UpdateRecruiterCompanyDto } from './dto/update-recruiter-company.dto';
import {
  createFileUploadOptions,
  createImageUploadOptions,
  toPublicUploadUrl,
} from '../../common/upload/multer-upload.util';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Roles(Role.CANDIDATE)
  @Get('candidate/me')
  @ApiOperation({ summary: 'Get my candidate profile' })
  getMyCandidateProfile(@CurrentUser() user: User) {
    return this.profilesService.getMyCandidateProfile(user.id);
  }

  @Roles(Role.RECRUITER, Role.ADMIN)
  @Get('candidate/:id')
  @ApiOperation({
    summary: 'Get candidate profile by candidate user ID for recruiters/admins',
  })
  getCandidateProfileById(@Param('id') id: string) {
    return this.profilesService.getCandidateProfileByUserId(id);
  }

  @Roles(Role.CANDIDATE)
  @Post('candidate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create candidate profile for current user' })
  @ApiResponse({ status: 201, description: 'Candidate profile created' })
  createCandidateProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateCandidateProfileDto,
  ) {
    return this.profilesService.createCandidateProfile(user.id, dto);
  }

  @Roles(Role.CANDIDATE)
  @Patch('candidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update candidate profile (partial update)' })
  updateCandidateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateCandidateProfileDto,
  ) {
    return this.profilesService.updateCandidateProfile(user.id, dto);
  }

  @Roles(Role.CANDIDATE)
  @Patch('candidate/photo')
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
  @ApiOperation({ summary: 'Upload candidate profile photo' })
  uploadCandidatePhoto(
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
    return this.profilesService.uploadCandidatePhoto(user.id, file.path);
  }

  @Roles(Role.CANDIDATE)
  @Post('candidate/certification-file')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', createFileUploadOptions('profiles/certifications')),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload certification file (pdf or image)' })
  uploadCertificationFile(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build({
          fileIsRequired: true,
          exceptionFactory: (error) => new BadRequestException(error),
        }),
    )
    file: Express.Multer.File,
  ) {
    // We return a public URL that the frontend can store against the certification entry
    return {
      message: 'Certification file uploaded successfully',
      data: {
        url: toPublicUploadUrl(file.path),
      },
    };
  }

  @Roles(Role.CANDIDATE)
  @Delete('candidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my candidate profile' })
  deleteCandidateProfile(@CurrentUser() user: User) {
    return this.profilesService.deleteCandidateProfile(user.id);
  }

  @Roles(Role.RECRUITER)
  @Get('recruiter/me')
  @ApiOperation({ summary: 'Get my recruiter profile' })
  getMyRecruiterProfile(@CurrentUser() user: User) {
    return this.profilesService.getMyRecruiterProfile(user.id);
  }

  @Roles(Role.RECRUITER)
  @Post('recruiter')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create recruiter profile for current user' })
  createRecruiterProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateRecruiterProfileDto,
  ) {
    return this.profilesService.createRecruiterProfile(user.id, dto);
  }

  @Roles(Role.RECRUITER)
  @Patch('recruiter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update recruiter profile (partial update)' })
  updateRecruiterProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateRecruiterProfileDto,
  ) {
    return this.profilesService.updateRecruiterProfile(user.id, dto);
  }

  @Roles(Role.RECRUITER)
  @Patch('recruiter/company')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Attach recruiter to another company and/or update current company details',
  })
  updateRecruiterCompany(
    @CurrentUser() user: User,
    @Body() dto: UpdateRecruiterCompanyDto,
  ) {
    return this.profilesService.updateRecruiterCompany(user.id, dto);
  }

  @Roles(Role.RECRUITER)
  @Patch('recruiter/company-logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor(
      'companyLogo',
      createImageUploadOptions('profiles/company-logos'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['companyLogo'],
      properties: {
        companyLogo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload recruiter company logo' })
  uploadRecruiterCompanyLogo(
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
    return this.profilesService.uploadRecruiterCompanyLogo(user.id, file.path);
  }

  @Roles(Role.RECRUITER)
  @Delete('recruiter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my recruiter profile' })
  deleteRecruiterProfile(@CurrentUser() user: User) {
    return this.profilesService.deleteRecruiterProfile(user.id);
  }
}
