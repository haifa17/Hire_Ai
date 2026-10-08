import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MailModule } from '../common/mail/mail.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [DatabaseModule, MailModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
