import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { RecommendationsService } from './recommendations.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

@SkipThrottle()
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // ── Job Recommendations (for candidates) ──────────────────────────────

  /**
   * GET /recommendations/jobs/:candidateId
   * Returns Top-K recommended jobs for a candidate.
   */
  @Get('jobs/:candidateId')
  async getJobRecommendations(
    @Param('candidateId') candidateId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    const k = query.topK ?? 10;
    const lang = query.language ?? 'en';
    return this.recommendationsService.getJobRecommendations(
      candidateId,
      k,
      lang,
    );
  }

  /**
   * POST /recommendations/jobs/:candidateId/refresh
   * Force-recompute job recommendations for a candidate.
   */
  @Post('jobs/:candidateId/refresh')
  async refreshJobRecommendations(
    @Param('candidateId') candidateId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    const k = query.topK ?? 10;
    const lang = query.language ?? 'en';
    return this.recommendationsService.refreshJobRecommendations(
      candidateId,
      k,
      lang,
    );
  }

  // ── Candidate Recommendations (for job offers) ────────────────────────

  /**
   * GET /recommendations/candidates/:jobId
   * Returns Top-K recommended candidates for a job offer.
   */
  @Get('candidates/:jobId')
  async getCandidateRecommendations(
    @Param('jobId') jobId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    const k = query.topK ?? 10;
    const lang = query.language ?? 'en';
    return this.recommendationsService.getCandidateRecommendations(
      jobId,
      k,
      lang,
    );
  }

  /**
   * POST /recommendations/candidates/:jobId/refresh
   * Force-recompute candidate recommendations for a job offer.
   */
  @Post('candidates/:jobId/refresh')
  async refreshCandidateRecommendations(
    @Param('jobId') jobId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    const k = query.topK ?? 10;
    const lang = query.language ?? 'en';
    return this.recommendationsService.refreshCandidateRecommendations(
      jobId,
      k,
      lang,
    );
  }
}
