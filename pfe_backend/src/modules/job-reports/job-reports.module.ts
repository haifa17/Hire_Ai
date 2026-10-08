import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JobReportsController } from './job-reports.controller';
import { JobReportsService } from './job-reports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [JobReportsController],
  providers: [JobReportsService],
  exports: [JobReportsService],
})
export class JobReportsModule {}
