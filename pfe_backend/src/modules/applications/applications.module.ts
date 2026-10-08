import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { PrismaService } from '../../database/prisma.service';
import { AiResumeService } from './ai/ai-resume.service';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, PrismaService, AiResumeService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
