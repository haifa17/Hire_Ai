import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { MatchingPreviewDto } from './dto/matching-preview.dto';
import { ExternalOfferDto, MatchOfferDto } from './dto/match-offer.dto';
import { toPublicUploadUrl } from '../../common/upload/multer-upload.util';
import {
  User,
  Role,
  ApplicationStatus,
  JobOffer,
  CandidateProfile,
  JobExperienceLevel,
  Prisma,
} from '@prisma/client';

type AiMatchingResponse = {
  success?: boolean;
  data?: {
    requestId?: string;
    provider?: string;
    model?: string;
    matchingResult?: unknown;
    content?: unknown;
  };
  error?: {
    message?: string;
  };
  message?: string;
};

type JobOfferMatchingSource = JobOffer & {
  company?: { name?: string | null } | null;
};

type CandidateMatchingSource = CandidateProfile & {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    address: string | null;
    phone: string | null;
  };
};

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private readonly applicationDetailsInclude = {
    candidate: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        photoUrl: true,
        candidateProfile: {
          select: {
            professionalSummary: true,
            skills: true,
          },
        },
      },
    },
    jobOffer: {
      include: {
        company: true,
        recruiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
            recruiterProfile: {
              select: {
                position: true,
              },
            },
          },
        },
      },
    },
  };

  async apply(
    user: User,
    dto: CreateApplicationDto,
    files: {
      cv?: Express.Multer.File[];
      coverLetter?: Express.Multer.File[];
      supportingDocuments?: Express.Multer.File[];
    },
  ) {
    const cvFile = files.cv?.[0];

    if (!cvFile) {
      throw new BadRequestException('CV file is required.');
    }

    const job = await this.prisma.jobOffer.findFirst({
      where: { id: dto.jobOfferId, deletedAt: null, status: 'PUBLISHED' },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException('Job offer not found or not published.');
    }

    const existing = await this.prisma.application.findFirst({
      where: { candidateId: user.id, jobOfferId: dto.jobOfferId },
    });

    if (existing) {
      throw new BadRequestException({
        message: 'You have already applied to this job.',
        existingApplicationId: existing.id,
      });
    }

    const storedPath =
      (cvFile as any).path || `${cvFile.destination}/${cvFile.filename}`;
    const publicUrl = toPublicUploadUrl(storedPath);

    const metadata = {
      originalName: cvFile.originalname,
      mimeType: cvFile.mimetype,
      size: cvFile.size,
      filename: cvFile.filename,
      path: storedPath,
      url: publicUrl,
    };

    const coverLetterFile = files.coverLetter?.[0];
    let coverLetterUrl: string | null = null;
    let coverLetterMetadata: any = null;

    if (coverLetterFile) {
      const coverPath =
        (coverLetterFile as any).path ||
        `${coverLetterFile.destination}/${coverLetterFile.filename}`;
      coverLetterUrl = toPublicUploadUrl(coverPath);
      coverLetterMetadata = {
        originalName: coverLetterFile.originalname,
        mimeType: coverLetterFile.mimetype,
        size: coverLetterFile.size,
        filename: coverLetterFile.filename,
        path: coverPath,
        url: coverLetterUrl,
      };
    }

    const supportingDocuments = (files.supportingDocuments ?? []).map(
      (supportingDocument) => {
        const supportingPath =
          (supportingDocument as any).path ||
          `${supportingDocument.destination}/${supportingDocument.filename}`;

        return {
          originalName: supportingDocument.originalname,
          mimeType: supportingDocument.mimetype,
          size: supportingDocument.size,
          filename: supportingDocument.filename,
          url: toPublicUploadUrl(supportingPath),
        };
      },
    );

    const application = await this.prisma.application.create({
      data: {
        candidateId: user.id,
        jobOfferId: dto.jobOfferId,
        coverLetter: coverLetterUrl || dto.coverLetter || null,
        coverLetterUrl:
          coverLetterUrl || (dto.coverLetter ? dto.coverLetter : null),
        coverLetterMetadata,
        cvUrl: publicUrl,
        cvMetadata: metadata,
        supportingDocuments,
        status: 'PENDING',
        aiAnalysis: null,
      },
    });

    // increment job applications count
    await this.prisma.jobOffer.update({
      where: { id: dto.jobOfferId },
      data: { applicationsCount: { increment: 1 } },
    });

    // Compute matching score asynchronously in the background so the user is not blocked
    this.computeApplicationAnalysis(application.id)
      .then(async (aiAnalysis) => {
        if (aiAnalysis) {
          await this.prisma.application.update({
            where: { id: application.id },
            data: { aiAnalysis },
          });
          this.logger.log(
            `Successfully computed matching score for application ${application.id}`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(
          `Failed to compute matching score for application ${application.id}: ${error.message}`,
          error.stack,
        );
      });

    return application;
  }

  async getMatchScore(user: User, applicationId: string, force = false) {
    const application = await this.findOne(user, applicationId);

    if (!application.aiAnalysis || force) {
      const aiAnalysis = await this.computeApplicationAnalysis(
        applicationId,
        force,
      );
      if (aiAnalysis) {
        await this.prisma.application.update({
          where: { id: applicationId },
          data: { aiAnalysis },
        });
        return aiAnalysis;
      }
    }

    return application.aiAnalysis;
  }

  async previewMatching(payload: MatchingPreviewDto) {
    const response = await this.postToAiMatching(payload);
    return this.extractMatchingResult(response);
  }

  /**
   * Scores the signed-in candidate's profile against a single offer, either
   * published on the platform or pasted from elsewhere. Nothing is stored:
   * this is a "should I apply?" check, not an application.
   */
  async matchOffer(user: User, dto: MatchOfferDto) {
    const hasPlatformOffer = Boolean(dto.jobOfferId);
    const hasExternalOffer = Boolean(dto.externalOffer);
    if (hasPlatformOffer === hasExternalOffer) {
      throw new BadRequestException(
        'Provide either jobOfferId or externalOffer, not both.',
      );
    }

    const candidate = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { candidateProfile: true },
    });
    if (!candidate?.candidateProfile) {
      throw new BadRequestException(
        'Complete your candidate profile before matching an offer.',
      );
    }

    let offer: { id: string | null; title: string; company: string };
    let jobOfferPayload: Record<string, unknown>;

    if (dto.jobOfferId) {
      const jobOffer = await this.prisma.jobOffer.findFirst({
        where: { id: dto.jobOfferId, status: 'PUBLISHED', deletedAt: null },
        include: { company: { select: { name: true } } },
      });
      if (!jobOffer) {
        throw new NotFoundException('Job offer not found or not published.');
      }
      offer = {
        id: jobOffer.id,
        title: jobOffer.title,
        company: jobOffer.company?.name ?? '',
      };
      jobOfferPayload = this.buildJobOfferPayload(jobOffer);
    } else {
      const external = dto.externalOffer as ExternalOfferDto;
      offer = {
        id: null,
        title: external.title.trim(),
        company: external.company?.trim() ?? '',
      };
      jobOfferPayload = this.buildExternalJobOfferPayload(external);
    }

    const response = await this.postToAiMatching({
      candidate: this.buildCandidatePayload(candidate),
      jobOffer: jobOfferPayload,
      language: dto.language ?? 'en',
    });
    const result = this.extractMatchingResult(response);
    if (!result) {
      throw new ServiceUnavailableException(
        'The matching service is unavailable. Please try again later.',
      );
    }

    return {
      source: hasPlatformOffer ? 'platform' : 'external',
      offer,
      result,
    };
  }

  private async computeApplicationAnalysis(
    applicationId: string,
    forceRecompute = false,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          include: {
            candidateProfile: true,
          },
        },
        jobOffer: {
          include: {
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return null;
    }

    const payload = {
      candidate: this.buildCandidatePayload(application.candidate, application),
      jobOffer: this.buildJobOfferPayload(application.jobOffer),
      language: 'en',
      forceRecompute,
    };

    const response = await this.postToAiMatching(payload);
    return this.extractMatchingResult(response);
  }

  private async postToAiMatching(payload: unknown) {
    const aiCandidateUrls = this.getAiServiceBaseUrls();
    const aiTimeoutMs = this.getAiTimeoutMs();

    let response: { data?: AiMatchingResponse } | null = null;
    let lastNetworkError: unknown = null;

    for (const baseUrl of aiCandidateUrls) {
      try {
        response = await axios.post(`${baseUrl}/api/ai/matching/run`, payload, {
          timeout: aiTimeoutMs,
          proxy: false,
        });
        break;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          this.logger.warn(
            `AI matching returned an error response from ${baseUrl}`,
          );
          return error.response.data as AiMatchingResponse;
        }
        lastNetworkError = error;
        this.logger.warn(`AI matching endpoint failed: ${baseUrl}`);
      }
    }

    if (!response) {
      const lastNetworkErrorMessage =
        lastNetworkError instanceof Error
          ? lastNetworkError.message
          : JSON.stringify(lastNetworkError);
      this.logger.warn(`AI matching unavailable: ${lastNetworkErrorMessage}`);
      return null;
    }

    return response.data;
  }

  private extractMatchingResult(response: AiMatchingResponse | null) {
    if (!response?.data) {
      return null;
    }

    return (response.data.matchingResult ??
      response.data.content ??
      null) as Prisma.InputJsonValue | null;
  }

  private buildCandidatePayload(candidate: any, application?: any) {
    const profile = candidate.candidateProfile;
    const identityName = [candidate.firstName, candidate.lastName]
      .filter(Boolean)
      .join(' ');
    const cvMetadata =
      application?.cvMetadata &&
      typeof application.cvMetadata === 'object' &&
      !Array.isArray(application.cvMetadata)
        ? (application.cvMetadata as Record<string, unknown>)
        : {};
    const cvSource =
      this.firstString(cvMetadata, ['path', 'url']) ||
      (typeof application?.cvUrl === 'string' ? application.cvUrl : '');

    // Matching must score the CV actually deposited with THIS application
    // against the job offer — not the candidate's general profile (which may
    // be stale or unrelated to the role applied for). When a CV file was
    // uploaded with the application, we deliberately leave the structured
    // fields (summary/experiences/skillsRaw/...) empty instead of pre-filling
    // them from `candidateProfile`: the AI service's extraction/structuring
    // cascade (extraction.py/structuring.py) treats a payload with
    // experiences+skillsRaw already populated as "already structured" and
    // skips re-parsing the extracted CV text, silently falling back to the
    // profile. Sending it empty forces the AI service to parse `sourceFile`/
    // `cvUrl` for real. The profile is used only as a fallback when no CV
    // file is available (e.g. previewMatching-style calls).
    const hasCvFile = Boolean(cvSource);

    return {
      id: candidate.id,
      documentId: application?.id ?? null,
      sourceFile: cvSource,
      cvUrl: typeof application?.cvUrl === 'string' ? application.cvUrl : '',
      identity: {
        name: identityName,
        location: candidate.address ?? '',
        email: candidate.email,
        phone: candidate.phone ?? '',
      },
      summary: hasCvFile ? '' : profile?.professionalSummary ?? '',
      experiences: hasCvFile ? [] : this.asObjectArray(profile?.experiences),
      education: hasCvFile ? [] : this.asObjectArray(profile?.education),
      skillsRaw: hasCvFile ? [] : this.asStringArray(profile?.skills),
      languages: hasCvFile ? [] : this.normalizeLanguages(profile?.languages),
      certifications: hasCvFile
        ? []
        : this.asStringArray(profile?.certifications),
      totalExperienceYears: hasCvFile
        ? 0
        : this.estimateExperienceYears(profile?.experiences),
      location: candidate.address ?? '',
      rawText:
        typeof cvMetadata.extractedText === 'string'
          ? cvMetadata.extractedText
          : '',
    };
  }

  private buildJobOfferPayload(jobOffer: any) {
    return {
      id: jobOffer.id,
      title: jobOffer.title,
      company: jobOffer.company?.name ?? '',
      missions: [
        jobOffer.description,
        ...jobOffer.responsibilities,
        ...jobOffer.requirements,
      ].filter((item): item is string => Boolean(item?.trim())),
      requiredSkillsRaw: this.asStringArray(jobOffer.requiredSkills),
      niceToHaveSkillsRaw: this.asStringArray(jobOffer.preferredSkills),
      // TODO: JobOffer has no `requiredCertifications` column yet (Prisma schema.prisma).
      // The AI service scores this criterion at a neutral 1.0 until this is added.
      requiredCertifications: [] as string[],
      requiredExperienceYears: this.mapExperienceLevel(
        jobOffer.experienceLevel,
      ),
      contractType: jobOffer.workplaceType,
      location: [jobOffer.location, jobOffer.city, jobOffer.country]
        .filter(Boolean)
        .join(', '),
      salaryRange: {
        min: jobOffer.salaryMin ?? null,
        max: jobOffer.salaryMax ?? null,
        currency: jobOffer.currency,
      },
      educationLevel: jobOffer.educationLevel ?? '',
      languages: this.asStringArray(jobOffer.languages),
      rawText: jobOffer.description,
    };
  }

  /**
   * Payload for an offer pasted from outside the platform. Only the text is
   * sent: the AI service extracts skills, experience, education and
   * languages from `rawText` before scoring (structuring.py::run_job_offer).
   */
  private buildExternalJobOfferPayload(offer: ExternalOfferDto) {
    const description = offer.description.trim();
    const rawText = [offer.title, offer.company, offer.location, description]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join('\n\n');

    return {
      id: null,
      title: offer.title.trim(),
      company: offer.company?.trim() ?? '',
      missions: [description],
      requiredSkillsRaw: [] as string[],
      niceToHaveSkillsRaw: [] as string[],
      requiredCertifications: [] as string[],
      location: offer.location?.trim() ?? '',
      languages: [] as string[],
      rawText,
    };
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

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const candidate = item as Record<string, unknown>;
          const keys = ['name', 'language', 'label', 'title', 'degree'];
          for (const key of keys) {
            const raw = candidate[key];
            if (typeof raw === 'string' && raw.trim()) {
              return raw.trim();
            }
          }
        }
        return '';
      })
      .filter((item) => item.length > 0);
  }

  private asObjectArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object'),
    );
  }

  private normalizeLanguages(
    value: unknown,
  ): Array<{ language: string; level: string }> {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (typeof item === 'string') {
          return { language: item.trim(), level: '' };
        }

        if (item && typeof item === 'object') {
          const candidate = item as Record<string, unknown>;
          const language = this.firstString(candidate, [
            'language',
            'name',
            'label',
          ]);
          const level = this.firstString(candidate, ['level', 'proficiency']);
          return { language, level };
        }

        return { language: '', level: '' };
      })
      .filter((item) => item.language.length > 0);
  }

  private firstString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private estimateExperienceYears(value: unknown): number {
    if (!Array.isArray(value) || value.length === 0) {
      return 0;
    }

    let totalMonths = 0;
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const startDate = this.parseDate(entry.startDate ?? entry.start_date);
      const endDate =
        this.parseDate(entry.endDate ?? entry.end_date) ?? new Date();
      if (!startDate) continue;

      const diffMonths = Math.max(
        0,
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth()),
      );
      totalMonths += diffMonths;
    }

    return Number((totalMonths / 12).toFixed(1));
  }

  private parseDate(value: unknown): Date | null {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private mapExperienceLevel(level: JobExperienceLevel): number {
    switch (level) {
      case 'ENTRY':
        return 0.5;
      case 'JUNIOR':
        return 1;
      case 'MID':
        return 3;
      case 'SENIOR':
        return 5;
      case 'LEAD':
        return 7;
      case 'EXECUTIVE':
        return 10;
      default:
        return 3;
    }
  }

  async findMyApplications(user: User) {
    return this.prisma.application.findMany({
      where: { candidateId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { jobOffer: { include: { company: true } } },
    });
  }

  async findApplicantsForJob(user: User, jobId: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found.');

    if (user.role !== Role.ADMIN && job.recruiterId !== user.id) {
      throw new ForbiddenException(
        'Not authorized to view applicants for this job.',
      );
    }

    return this.prisma.application.findMany({
      where: { jobOfferId: jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  async updateStatus(
    user: User,
    applicationId: string,
    status: ApplicationStatus,
  ) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new NotFoundException('Application not found.');

    const job = await this.prisma.jobOffer.findUnique({
      where: { id: app.jobOfferId },
    });
    if (!job) throw new NotFoundException('Related job not found.');

    if (user.role !== Role.ADMIN && job.recruiterId !== user.id) {
      throw new ForbiddenException('Not authorized to change status.');
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status },
      include: this.applicationDetailsInclude,
    });
  }

  async findOne(user: User, id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: this.applicationDetailsInclude,
    });
    if (!app) throw new NotFoundException('Application not found.');

    const job = await this.prisma.jobOffer.findUnique({
      where: { id: app.jobOfferId },
    });

    if (user.role === Role.ADMIN) return app;
    if (user.role === Role.CANDIDATE && app.candidateId === user.id) return app;
    if (user.role === Role.RECRUITER && job?.recruiterId === user.id)
      return app;

    throw new ForbiddenException('Not authorized to view this application.');
  }

  async withdraw(user: User, id: string) {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found.');
    if (app.candidateId !== user.id)
      throw new ForbiddenException(
        'You can only withdraw your own application.',
      );

    await this.prisma.application.delete({ where: { id } });

    // decrement job counter
    await this.prisma.jobOffer.update({
      where: { id: app.jobOfferId },
      data: { applicationsCount: { decrement: 1 } },
    });

    return { message: 'Application withdrawn' };
  }
}
