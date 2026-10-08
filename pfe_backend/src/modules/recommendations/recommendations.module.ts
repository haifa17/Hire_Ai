import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsAiService } from './recommendations-ai.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationsAiService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
