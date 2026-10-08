import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { JobOfferOwnershipGuard } from './guards/job-offer-ownership.guard';
import { JobOffersAiService } from './job-offers-ai.service';
import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './job-offers.service';
import { RecommendationsModule } from '../recommendations/recommendations.module';

@Module({
  imports: [DatabaseModule, ConfigModule, RecommendationsModule],
  controllers: [JobOffersController],
  providers: [JobOffersService, JobOffersAiService, JobOfferOwnershipGuard],
})
export class JobOffersModule {}
