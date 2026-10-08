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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { QueryRecruiterAvailabilityDto } from './dto/query-recruiter-availability.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { InterviewsService } from './interviews.service';

@ApiTags('Interviews')
@Controller()
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Post('interviews')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a candidate interview' })
  create(@CurrentUser() user: User, @Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(user, dto);
  }

  @ApiBearerAuth()
  @Get('interviews/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get interviews accessible to the current user' })
  findMine(@CurrentUser() user: User) {
    return this.interviewsService.findMine(user);
  }

  @ApiBearerAuth()
  @Get('interviews/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get interview details by id' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.interviewsService.findOne(user, id);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Patch('interviews/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update, reschedule, or cancel an interview' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewsService.update(user, id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Delete('interviews/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an interview' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.interviewsService.remove(user, id);
  }

  @ApiBearerAuth()
  @Roles(Role.RECRUITER, Role.ADMIN)
  @Get('recruiters/:id/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recruiter busy slots in a date range' })
  availability(
    @CurrentUser() user: User,
    @Param('id') recruiterId: string,
    @Query() query: QueryRecruiterAvailabilityDto,
  ) {
    return this.interviewsService.getRecruiterAvailability(
      user,
      recruiterId,
      query,
    );
  }
}
