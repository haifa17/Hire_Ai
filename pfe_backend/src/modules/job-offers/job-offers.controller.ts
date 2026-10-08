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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role, User } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiGenerateJobOfferDto } from './dto/ai-generate-job-offer.dto';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { QueryJobOffersDto } from './dto/query-job-offers.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { JobOfferOwnershipGuard } from './guards/job-offer-ownership.guard';
import { JobOffersService } from './job-offers.service';

@ApiTags('Job Offers')
@Controller('job-offers')
export class JobOffersController {
  constructor(private readonly jobOffersService: JobOffersService) {}

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job offer as recruiter' })
  create(@CurrentUser() user: User, @Body() dto: CreateJobOfferDto) {
    return this.jobOffersService.create(user, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Post('ai-generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a structured job draft from a short AI prompt',
  })
  aiGenerate(@Body() dto: AiGenerateJobOfferDto) {
    return this.jobOffersService.aiGenerate(dto);
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List public published job offers with filters' })
  findAllPublic(@Query() query: QueryJobOffersDto) {
    return this.jobOffersService.findPublic(query);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Get('company/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List my company job offers (all statuses)' })
  findMyCompanyOffers(
    @CurrentUser() user: User,
    @Query() query: QueryJobOffersDto,
  ) {
    return this.jobOffersService.findCompanyMine(user, query);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all job offers for admin' })
  findAllForAdmin(@Query() query: QueryJobOffersDto) {
    return this.jobOffersService.findAdminAll(query);
  }

  @Public()
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get published job offer by slug' })
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: User,
    @Req() req?: Request,
  ) {
    const clientIp = (req?.headers?.['x-forwarded-for'] as string) || req?.ip;
    return this.jobOffersService.findBySlug(slug, user, clientIp);
  }

  @Public()
  @Get('public/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get published job offer by id' })
  findPublicById(
    @Param('id') id: string,
    @CurrentUser() user?: User,
    @Req() req?: Request,
  ) {
    const clientIp = (req?.headers?.['x-forwarded-for'] as string) || req?.ip;
    return this.jobOffersService.findPublicById(id, user, clientIp);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JobOfferOwnershipGuard)
  @Get(':id/top-candidates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-ranked top candidates for one job offer' })
  topCandidates(@Param('id') id: string) {
    return this.jobOffersService.topCandidates(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JobOfferOwnershipGuard)
  @Get('analytics/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get analytics for one job offer' })
  analytics(@Param('id') id: string) {
    return this.jobOffersService.analytics(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JobOfferOwnershipGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one owned job offer by id' })
  findOne(@Param('id') id: string) {
    return this.jobOffersService.findOneOwned(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JobOfferOwnershipGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an owned job offer' })
  update(@Param('id') id: string, @Body() dto: UpdateJobOfferDto) {
    return this.jobOffersService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JobOfferOwnershipGuard)
  @Patch(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an owned job offer' })
  publish(@Param('id') id: string) {
    return this.jobOffersService.publish(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JobOfferOwnershipGuard)
  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an owned job offer' })
  close(@Param('id') id: string) {
    return this.jobOffersService.close(id);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @UseGuards(JobOfferOwnershipGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an owned job offer' })
  @ApiResponse({ status: 200, description: 'Job offer marked as deleted' })
  remove(@Param('id') id: string) {
    return this.jobOffersService.remove(id);
  }
}
