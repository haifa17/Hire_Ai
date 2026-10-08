import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { OptimizeResumeDto } from './dto/optimize-resume.dto';
import { EnhanceResumeDto } from './dto/enhance-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';

@Controller('resumes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CANDIDATE) // Only candidates can manage resumes
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('generate')
  create(@CurrentUser() user: User, @Body() createResumeDto: CreateResumeDto) {
    return this.resumesService.create(user.id, createResumeDto);
  }

  @Post('enhance')
  @UseInterceptors(FileInterceptor('file'))
  enhance(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() enhanceResumeDto: EnhanceResumeDto,
  ) {
    return this.resumesService.enhanceResume(user.id, file, enhanceResumeDto);
  }

  @Post(':id/score')
  scoreResume(@Param('id') id: string, @CurrentUser() user: User) {
    return this.resumesService.scoreResume(id, user.id);
  }

  @Post(':id/optimize')
  optimizeResume(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: OptimizeResumeDto,
  ) {
    return this.resumesService.optimizeResume(id, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.resumesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.resumesService.findOne(id, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateResumeDto: UpdateResumeDto,
  ) {
    return this.resumesService.update(id, user.id, updateResumeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.resumesService.remove(id, user.id);
  }
}
