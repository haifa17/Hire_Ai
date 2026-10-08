import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  RecommendationsAiService,
  RecommendationResponseDto,
} from './recommendations-ai.service';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: RecommendationsAiService,
  ) {}

  private readonly generatingCandidates = new Set<string>();
  private readonly generatingJobs = new Set<string>();

  // ── Job Recommendations (for candidates) ──────────────────────────────

  async getJobRecommendations(
    candidateId: string,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    // 1. Check if active recommendations already exist in database
    const existing = await this.prisma.recommendation.findMany({
      where: {
        sourceId: candidateId,
        sourceType: 'candidate',
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { rank: 'asc' },
      take: topK,
    });

    if (existing.length > 0) {
      return {
        request_id: candidateId,
        source_id: candidateId,
        source_type: 'candidate',
        recommendations: existing.map((rec) => ({
          rank: rec.rank,
          entity_id: rec.targetId,
          entity_type: rec.targetType,
          overall_score: rec.overallScore,
          breakdown: rec.scoreBreakdown as any,
          explanation: rec.explanation,
          metadata: (rec.metadataPayload as Record<string, unknown>) || {},
        })),
        computed_at: existing[0].createdAt.toISOString(),
        cached: true,
        generating: false,
      };
    }

    // 2. If NO recommendations exist -> trigger AI recommendation generation in background (async)
    if (!this.generatingCandidates.has(candidateId)) {
      this.generatingCandidates.add(candidateId);
      this.refreshJobRecommendations(candidateId, topK, language)
        .catch((err) => {
          this.logger.warn(
            `Background recommendation generation failed for candidate ${candidateId}: ${err.message}`,
          );
        })
        .finally(() => {
          this.generatingCandidates.delete(candidateId);
        });
    }

    return {
      request_id: candidateId,
      source_id: candidateId,
      source_type: 'candidate',
      recommendations: [],
      computed_at: new Date().toISOString(),
      cached: false,
      generating: true,
    };
  }

  async refreshJobRecommendations(
    candidateId: string,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    const profile = await this.buildCandidateProfile(candidateId);
    await this.indexPublishedJobs();
    return this.aiService.refreshJobRecommendations(
      candidateId,
      profile,
      topK,
      language,
    );
  }

  // ── Candidate Recommendations (for job offers) ────────────────────────

  async getCandidateRecommendations(
    jobId: string,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    const existing = await this.prisma.recommendation.findMany({
      where: {
        sourceId: jobId,
        sourceType: 'job',
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { rank: 'asc' },
      take: topK,
    });

    if (existing.length > 0) {
      return {
        request_id: jobId,
        source_id: jobId,
        source_type: 'job',
        recommendations: existing.map((rec) => ({
          rank: rec.rank,
          entity_id: rec.targetId,
          entity_type: rec.targetType,
          overall_score: rec.overallScore,
          breakdown: rec.scoreBreakdown as any,
          explanation: rec.explanation,
          metadata: (rec.metadataPayload as Record<string, unknown>) || {},
        })),
        computed_at: existing[0].createdAt.toISOString(),
        cached: true,
        generating: false,
      };
    }

    if (!this.generatingJobs.has(jobId)) {
      this.generatingJobs.add(jobId);
      this.refreshCandidateRecommendations(jobId, topK, language)
        .catch((err) => {
          this.logger.warn(
            `Background recommendation generation failed for job ${jobId}: ${err.message}`,
          );
        })
        .finally(() => {
          this.generatingJobs.delete(jobId);
        });
    }

    return {
      request_id: jobId,
      source_id: jobId,
      source_type: 'job',
      recommendations: [],
      computed_at: new Date().toISOString(),
      cached: false,
      generating: true,
    };
  }

  async refreshCandidateRecommendations(
    jobId: string,
    topK = 10,
    language = 'en',
  ): Promise<RecommendationResponseDto> {
    const jobOffer = await this.buildJobOfferPayload(jobId);
    await this.indexCandidateProfiles();
    return this.aiService.refreshCandidateRecommendations(
      jobId,
      jobOffer,
      topK,
      language,
    );
  }

  // ── Auto-trigger on publish ───────────────────────────────────────────

  async triggerCandidateRecommendations(jobId: string): Promise<void> {
    try {
      const jobOffer = await this.buildJobOfferPayload(jobId);
      await this.indexJobs([jobOffer]);
      await this.indexCandidateProfiles();
      // Fire-and-forget: don't block the publish flow
      this.aiService
        .recommendCandidatesForJob(jobId, jobOffer, 10, 'en')
        .catch((err) =>
          this.logger.warn(
            `Auto-recommendation failed for job ${jobId}: ${err.message}`,
          ),
        );
    } catch (error) {
      this.logger.warn(
        `Could not trigger recommendations for job ${jobId}: ${error.message}`,
      );
    }
  }

  // ── Profile builders ──────────────────────────────────────────────────

  private async buildCandidateProfile(
    candidateId: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        photoUrl: true,
        candidateProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Candidate not found: ${candidateId}`);
    }

    return this.buildCandidateProfilePayload(user);
  }

  private buildCandidateProfilePayload(user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    photoUrl?: string | null;
    candidateProfile?: any;
  }): Record<string, unknown> {
    const prof = user.candidateProfile || {};
    return {
      id: user.id,
      userId: user.id,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        photoUrl: user.photoUrl,
      },
      profile: {
        ...prof,
        desiredSalary: prof.desiredSalary
          ? Number(prof.desiredSalary.toString())
          : null,
      },
    };
  }

  private async buildJobOfferPayload(
    jobId: string,
  ): Promise<Record<string, unknown>> {
    const jobOffer = await this.prisma.jobOffer.findFirst({
      where: { id: jobId, deletedAt: null },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            companySize: true,
            description: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!jobOffer) {
      throw new NotFoundException(`Job offer not found: ${jobId}`);
    }

    return this.buildJobOfferPayloadFromRecord(jobOffer);
  }

  private buildJobOfferPayloadFromRecord(
    jobOffer: any,
  ): Record<string, unknown> {
    return {
      id: jobOffer.id,
      title: jobOffer.title,
      slug: jobOffer.slug,
      department: jobOffer.department,
      employmentType: jobOffer.employmentType,
      workplaceType: jobOffer.workplaceType,
      location: jobOffer.location,
      country: jobOffer.country,
      city: jobOffer.city,
      salaryMin: jobOffer.salaryMin
        ? Number(jobOffer.salaryMin.toString())
        : null,
      salaryMax: jobOffer.salaryMax
        ? Number(jobOffer.salaryMax.toString())
        : null,
      currency: jobOffer.currency,
      experienceLevel: jobOffer.experienceLevel,
      educationLevel: jobOffer.educationLevel,
      description: jobOffer.description,
      responsibilities: jobOffer.responsibilities,
      requirements: jobOffer.requirements,
      preferredSkills: jobOffer.preferredSkills,
      requiredSkills: jobOffer.requiredSkills,
      benefits: jobOffer.benefits,
      languages: jobOffer.languages,
      status: jobOffer.status,
      company: jobOffer.company,
      recruiter: jobOffer.recruiter,
    };
  }

  private async indexPublishedJobs(): Promise<void> {
    const jobs = await this.prisma.jobOffer.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            companySize: true,
            description: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await this.indexJobs(
      jobs.map((job) => this.buildJobOfferPayloadFromRecord(job)),
    );
  }

  private async indexJobs(jobs: Record<string, unknown>[]): Promise<void> {
    if (jobs.length === 0) {
      return;
    }

    try {
      const result = await this.aiService.indexJobs(jobs);
      this.logger.log(
        `Indexed ${result.indexed}/${result.total} jobs for recommendations`,
      );
    } catch (error) {
      this.logger.warn(
        `Could not index jobs for recommendations: ${error.message}`,
      );
    }
  }

  private async indexCandidateProfiles(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        candidateProfile: {
          isNot: null,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        photoUrl: true,
        candidateProfile: true,
      },
    });

    const candidates = users
      .filter((user) => user.candidateProfile)
      .map((user) => this.buildCandidateProfilePayload(user));

    if (candidates.length === 0) {
      return;
    }

    try {
      const result = await this.aiService.indexCandidates(candidates);
      this.logger.log(
        `Indexed ${result.indexed}/${result.total} candidates for recommendations`,
      );
    } catch (error) {
      this.logger.warn(
        `Could not index candidates for recommendations: ${error.message}`,
      );
    }
  }
}
