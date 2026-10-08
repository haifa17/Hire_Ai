import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { createApplicationUploadOptions } from '../../common/upload/multer-upload.util';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { MatchingPreviewDto } from './dto/matching-preview.dto';
import { MatchOfferDto } from './dto/match-offer.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @ApiBearerAuth()
  @Roles(Role.CANDIDATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 },
        { name: 'coverLetter', maxCount: 1 },
        { name: 'supportingDocuments', maxCount: 5 },
      ],
      createApplicationUploadOptions(),
    ),
  )
  @ApiOperation({ summary: 'Apply to a job (candidate only)' })
  apply(
    @CurrentUser() user: User,
    @UploadedFiles()
    files: {
      cv?: Express.Multer.File[];
      coverLetter?: Express.Multer.File[];
      supportingDocuments?: Express.Multer.File[];
    },
    @Body() dto: CreateApplicationDto,
  ) {
    return this.service.apply(user, dto, files);
  }

  @ApiBearerAuth()
  @Roles(Role.CANDIDATE)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my applications (candidate)' })
  myApps(@CurrentUser() user: User) {
    return this.service.findMyApplications(user);
  }

  @ApiBearerAuth()
  @Roles(Role.CANDIDATE)
  @Post('match-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview CV/job offer matching via the AI microservice',
  })
  matchPreview(@Body() payload: MatchingPreviewDto) {
    return this.service.previewMatching(payload);
  }

  @ApiBearerAuth()
  @Roles(Role.CANDIDATE)
  @Post('match-offer')
  // Each call runs the full AI matching pipeline (LLM + embeddings).
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Score my profile against a platform job offer or an external offer (candidate)',
  })
  matchOffer(@CurrentUser() user: User, @Body() dto: MatchOfferDto) {
    return this.service.matchOffer(user, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Get('job/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get applicants for a job (recruiter)' })
  jobApplicants(@CurrentUser() user: User, @Param('jobId') jobId: string) {
    return this.service.findApplicantsForJob(user, jobId);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Get(':id/match-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get or compute the matching score for one application',
  })
  getMatchScore(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    return this.service.getMatchScore(user, id, force === 'true');
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update application status (recruiter)' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto.status);
  }

  @ApiBearerAuth()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get single application (candidate, recruiter, admin)',
  })
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @ApiBearerAuth()
  @Roles(Role.CANDIDATE)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw / delete an application (candidate)' })
  withdraw(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.withdraw(user, id);
  }
}
