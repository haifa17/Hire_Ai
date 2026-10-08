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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateJobReportDto } from './dto/create-job-report.dto';
import { QueryJobReportsDto } from './dto/query-job-reports.dto';
import { JobReportsService } from './job-reports.service';

@ApiTags('Job Reports')
@ApiBearerAuth()
@Controller('job-reports')
export class JobReportsController {
  constructor(private readonly jobReportsService: JobReportsService) {}

  @Roles(Role.CANDIDATE, Role.RECRUITER, Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report a job offer' })
  createReport(@CurrentUser() user: User, @Body() dto: CreateJobReportDto) {
    return this.jobReportsService.createReport(user, dto);
  }

  @Roles(Role.CANDIDATE, Role.RECRUITER, Role.ADMIN)
  @Get('check/:jobOfferId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if current user has reported a job offer' })
  checkUserReport(
    @CurrentUser() user: User,
    @Param('jobOfferId') jobOfferId: string,
  ) {
    return this.jobReportsService.checkUserReport(user.id, jobOfferId);
  }

  @Roles(Role.ADMIN)
  @Get('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all job reports for administrator' })
  findAllForAdmin(@Query() query: QueryJobReportsDto) {
    return this.jobReportsService.findAllForAdmin(query);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a report as resolved without deleting the job',
  })
  resolveReport(@Param('id') id: string) {
    return this.jobReportsService.resolveReport(id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/jobs/:jobOfferId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a job offer and automatically resolve all its reports',
  })
  deleteJobFromReport(@Param('jobOfferId') jobOfferId: string) {
    return this.jobReportsService.deleteJobFromReport(jobOfferId);
  }
}
