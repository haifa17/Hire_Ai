import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

// Unified 7-criterion breakdown, shared verbatim with the matching pipeline
// (see backend/ai-service/app/schemas/scoring.py::UnifiedBreakdownSchema).
// Each field is `number | null`: `null` means the criterion could not be
// evaluated (missing requirement or missing candidate data) — never coerce
// it to 0, and never re-add the removed fields (cross_encoder_score,
// location_compatibility, salary_compatibility, availability), which no
// longer exist now that the reranker and those criteria have been dropped.
export interface UnifiedBreakdownDto {
  skills: number | null;
  experience: number | null;
  semantic: number | null;
  education: number | null;
  projects: number | null;
  languages: number | null;
  certifications: number | null;
}

export interface RecommendationItemDto {
  rank: number;
  entity_id: string;
  entity_type: string;
  overall_score: number | null;
  breakdown: UnifiedBreakdownDto;
  unavailable_criteria?: string[];
  explanation: string;
  metadata: Record<string, unknown>;
}

export interface RecommendationResponseDto {
  request_id: string;
  source_id: string;
  source_type: string;
  recommendations: RecommendationItemDto[];
  computed_at: string;
  cached: boolean;
  generating?: boolean;
}

export interface RecommendationIndexResponseDto {
  indexed: number;
  total: number;
}

@Injectable()
export class RecommendationsAiService {
  private readonly logger = new Logger(RecommendationsAiService.name);

  constructor(private readonly configService: ConfigService) {}

  async recommendJobsForCandidate(
    candidateId: string,
    candidateProfile: Record<string, unknown>,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    return this.callAiService<RecommendationResponseDto>(
      '/api/ai/recommendations/jobs',
      {
        candidate_id: candidateId,
        candidate_profile: candidateProfile,
        top_k: topK,
        language,
      },
    );
  }

  async recommendCandidatesForJob(
    jobId: string,
    jobOffer: Record<string, unknown>,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    return this.callAiService<RecommendationResponseDto>(
      '/api/ai/recommendations/candidates',
      {
        job_id: jobId,
        job_offer: jobOffer,
        top_k: topK,
        language,
      },
    );
  }

  async refreshJobRecommendations(
    candidateId: string,
    candidateProfile: Record<string, unknown>,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    return this.callAiService<RecommendationResponseDto>(
      '/api/ai/recommendations/jobs/refresh',
      {
        candidate_id: candidateId,
        candidate_profile: candidateProfile,
        top_k: topK,
        language,
      },
    );
  }

  async refreshCandidateRecommendations(
    jobId: string,
    jobOffer: Record<string, unknown>,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    return this.callAiService<RecommendationResponseDto>(
      '/api/ai/recommendations/candidates/refresh',
      {
        job_id: jobId,
        job_offer: jobOffer,
        top_k: topK,
        language,
      },
    );
  }

  async indexJobs(
    jobs: Record<string, unknown>[],
  ): Promise<RecommendationIndexResponseDto> {
    return this.callAiService<RecommendationIndexResponseDto>(
      '/api/ai/recommendations/index/jobs',
      {
        jobs,
      },
    );
  }

  async indexCandidates(
    candidates: Record<string, unknown>[],
  ): Promise<RecommendationIndexResponseDto> {
    return this.callAiService<RecommendationIndexResponseDto>(
      '/api/ai/recommendations/index/candidates',
      {
        candidates,
      },
    );
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async callAiService<TResponse = RecommendationResponseDto>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<TResponse> {
    const baseUrls = this.getAiServiceBaseUrls();
    const timeoutMs = this.getAiTimeoutMs();

    let response: AxiosResponse | null = null;
    let lastErrorMessage: string | null = null;

    for (const baseUrl of baseUrls) {
      const attempt = await this.tryAiServiceCall(
        baseUrl,
        path,
        body,
        timeoutMs,
      );
      if (attempt.response) {
        response = attempt.response;
        break;
      }
      lastErrorMessage = attempt.errorMessage ?? lastErrorMessage;
    }

    if (!response || !response.data) {
      throw new BadGatewayException(
        lastErrorMessage ?? 'AI recommendation service is unavailable.',
      );
    }

    const data = response.data?.data || response.data;
    return data as TResponse;
  }

  private async tryAiServiceCall(
    baseUrl: string,
    path: string,
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<{ response: AxiosResponse | null; errorMessage: string | null }> {
    try {
      const response = await axios.post(`${baseUrl}${path}`, body, {
        timeout: timeoutMs,
        proxy: false,
      });
      if (response?.status === 200 || response?.status === 201) {
        return { response, errorMessage: null };
      }
      return { response: null, errorMessage: null };
    } catch (error) {
      const errorMessage = this.extractAiServiceErrorMessage(error);
      this.logger.warn(
        `AI service at ${baseUrl} unreachable/error for ${path}: ${
          axios.isAxiosError(error) ? error.message : (error as Error).message
        }`,
      );
      return { response: null, errorMessage };
    }
  }

  private extractAiServiceErrorMessage(error: unknown): string | null {
    if (axios.isAxiosError(error) && error.response?.data) {
      const responseMessage =
        (error.response.data as { message?: string; detail?: string })
          ?.message || (error.response.data as any)?.detail;
      return responseMessage ? String(responseMessage) : null;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return null;
  }

  private getAiServiceBaseUrls(): string[] {
    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';

    return Array.from(
      new Set([
        aiServiceUrl,
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:8001',
        'http://127.0.0.1:8001',
      ]),
    );
  }

  private getAiTimeoutMs(): number {
    return Number(
      this.configService.get<string>('AI_SERVICE_TIMEOUT_MS') ?? '300000',
    );
  }
}
