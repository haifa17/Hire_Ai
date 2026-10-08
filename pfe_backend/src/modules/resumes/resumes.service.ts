import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { ATSScoreDto } from './dto/ats-score.dto';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { OptimizeResumeDto } from './dto/optimize-resume.dto';
import { EnhanceResumeDto } from './dto/enhance-resume.dto';

type JobOfferResumeSource = Prisma.JobOfferGetPayload<{
  include: {
    company: {
      select: {
        name: true;
      };
    };
  };
}>;

const RESUME_TEMPLATE_IDS = new Set([
  'executive',
  'analyst',
  'worded',
  'balanced',
]);

type AiScoreResponse = {
  success?: boolean;
  data?: {
    requestId?: string;
    provider?: string;
    model?: string;
    atsScore?: ATSScoreDto;
  };
  error?: {
    message?: string;
  };
  message?: string;
};

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}


  /**
   * The AI service could not be reached on any configured URL. Reported as a
   * 503 so clients can tell "AI is down" from a bug in this API; the raw
   * connection error would otherwise surface as a generic 500.
   */
  private aiUnavailable(cause: unknown): ServiceUnavailableException {
    this.logger.error(
      `AI service unreachable: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    return new ServiceUnavailableException(
      'The AI service is currently unavailable. Please try again later.',
    );
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

  private async generateResumeContent(payload: Record<string, unknown>) {
    const aiCandidateUrls = this.getAiServiceBaseUrls();
    const aiTimeoutMs = this.getAiTimeoutMs();

    let response: { data?: any } | null = null;
    let lastNetworkError: unknown = null;

    for (const baseUrl of aiCandidateUrls) {
      try {
        response = await axios.post(
          `${baseUrl}/api/ai/generate-resume`,
          payload,
          {
            timeout: aiTimeoutMs,
            proxy: false,
          },
        );
        break;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          throw err;
        }
        lastNetworkError = err;
        this.logger.warn(`AI endpoint failed: ${baseUrl}`);
      }
    }

    if (!response) {
      throw this.aiUnavailable(lastNetworkError);
    }

    const aiContent = response.data?.data?.content as Prisma.InputJsonValue;
    if (!aiContent) {
      throw new HttpException(
        'AI service returned an invalid payload.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return aiContent;
  }

  private async requestAtsScore(
    resumeContent: Prisma.InputJsonValue,
    jobDescription: string,
  ): Promise<ATSScoreDto> {
    const aiCandidateUrls = this.getAiServiceBaseUrls();
    const aiTimeoutMs = this.getAiTimeoutMs();

    let response: { data?: AiScoreResponse } | null = null;
    let lastNetworkError: unknown = null;

    for (const baseUrl of aiCandidateUrls) {
      try {
        response = await axios.post(
          `${baseUrl}/api/ai/score-resume`,
          {
            resumeContent,
            jobDescription,
          },
          {
            timeout: aiTimeoutMs,
            proxy: false,
          },
        );
        break;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          throw err;
        }
        lastNetworkError = err;
        this.logger.warn(`ATS scoring endpoint failed: ${baseUrl}`);
      }
    }

    if (!response) {
      throw this.aiUnavailable(lastNetworkError);
    }

    const atsScore = response.data?.data?.atsScore;
    if (!atsScore) {
      throw new HttpException(
        'AI service returned an invalid ATS score payload.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return atsScore;
  }

  private formatJobOfferDescription(jobOffer: JobOfferResumeSource): string {
    const sections = [
      `Job offer source: ${jobOffer.company?.name ?? 'Unknown company'}`,
      `Title: ${jobOffer.title}`,
      `Location: ${jobOffer.location}, ${jobOffer.city}, ${jobOffer.country}`,
      `Employment type: ${jobOffer.employmentType}`,
      `Workplace type: ${jobOffer.workplaceType}`,
      `Experience level: ${jobOffer.experienceLevel}`,
      jobOffer.educationLevel
        ? `Education level: ${jobOffer.educationLevel}`
        : null,
      jobOffer.description ? `Description:\n${jobOffer.description}` : null,
      jobOffer.responsibilities.length > 0
        ? `Responsibilities:\n- ${jobOffer.responsibilities.join('\n- ')}`
        : null,
      jobOffer.requirements.length > 0
        ? `Requirements:\n- ${jobOffer.requirements.join('\n- ')}`
        : null,
      jobOffer.requiredSkills.length > 0
        ? `Required skills:\n- ${jobOffer.requiredSkills.join('\n- ')}`
        : null,
      jobOffer.preferredSkills.length > 0
        ? `Preferred skills:\n- ${jobOffer.preferredSkills.join('\n- ')}`
        : null,
      jobOffer.benefits.length > 0
        ? `Benefits:\n- ${jobOffer.benefits.join('\n- ')}`
        : null,
      jobOffer.languages.length > 0
        ? `Languages:\n- ${jobOffer.languages.join('\n- ')}`
        : null,
    ].filter((section): section is string => Boolean(section));

    return sections.join('\n\n');
  }

  private async resolveJobDescription(dto: {
    jobOfferId?: string;
    jobDescription?: string;
  }) {
    const freeTextDescription = dto.jobDescription?.trim();

    if (dto.jobOfferId) {
      const jobOffer = await this.prisma.jobOffer.findFirst({
        where: {
          id: dto.jobOfferId,
          deletedAt: null,
          status: 'PUBLISHED',
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!jobOffer) {
        throw new NotFoundException('Published job offer not found.');
      }

      return this.formatJobOfferDescription(jobOffer);
    }

    if (!freeTextDescription) {
      throw new BadRequestException(
        'Either a job offer or a job description is required.',
      );
    }

    return freeTextDescription;
  }

  private resolveResumeTemplate(template?: string): string {
    if (template && RESUME_TEMPLATE_IDS.has(template)) {
      return template;
    }

    return 'executive';
  }

  private applyTemplateToContent(
    content: Prisma.InputJsonValue,
    template: string,
  ): Prisma.InputJsonValue {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return content;
    }

    const record = content as Record<string, unknown>;
    const theme =
      record.theme &&
      typeof record.theme === 'object' &&
      !Array.isArray(record.theme)
        ? (record.theme as Record<string, unknown>)
        : {};

    return {
      ...record,
      theme: {
        ...theme,
        template,
      },
    };
  }

  async create(userId: string, createResumeDto: CreateResumeDto) {
    const candidateProfile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!candidateProfile) {
      throw new NotFoundException(
        'Candidate profile not found. Please complete your profile first.',
      );
    }

    const jobDescription = await this.resolveJobDescription(createResumeDto);
    const template = this.resolveResumeTemplate(createResumeDto.template);

    const payload = {
      profile: {
        firstName: candidateProfile.user.firstName,
        lastName: candidateProfile.user.lastName,
        email: candidateProfile.user.email,
        phone: candidateProfile.user.phone,
        address: candidateProfile.user.address,
        professionalSummary: candidateProfile.professionalSummary,
        socialLinks: candidateProfile.socialLinks,
        experiences: candidateProfile.experiences,
        education: candidateProfile.education,
        skills: candidateProfile.skills,
        languages: candidateProfile.languages,
        projects: candidateProfile.projects,
        certifications: candidateProfile.certifications,
      },
      jobDescription,
      language: createResumeDto.language,
    };

    let aiContent: Prisma.InputJsonValue;
    try {
      aiContent = await this.generateResumeContent(payload);
    } catch (error) {
      this.logger.error('Failed to generate resume from AI service', error);

      if (axios.isAxiosError(error)) {
        const aiPayload = error.response?.data as {
          error?: { message?: string };
          message?: string;
        };

        const aiErrorMessage =
          aiPayload?.error?.message || aiPayload?.message || error.message;

        throw new HttpException(
          `AI service error: ${aiErrorMessage}`,
          error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        'AI Service failed to generate the resume. Ensure Python service and Ollama are running.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const visualContent = this.applyTemplateToContent(aiContent, template);

    const resume = await this.prisma.resume.create({
      data: {
        candidateId: userId,
        title: createResumeDto.title,
        language: createResumeDto.language as any,
        jobDescription,
        content: visualContent,
      },
    });

    try {
      const atsScore = await this.requestAtsScore(
        visualContent,
        jobDescription,
      );

      return await this.prisma.resume.update({
        where: { id: resume.id },
        data: { atsScore: atsScore as unknown as Prisma.InputJsonValue },
      });
    } catch (error) {
      this.logger.warn(
        `ATS score could not be computed for resume ${resume.id}`,
      );

      if (axios.isAxiosError(error)) {
        const aiPayload = error.response?.data as AiScoreResponse;
        const aiErrorMessage =
          aiPayload?.error?.message || aiPayload?.message || error.message;

        this.logger.warn(`ATS scoring error: ${aiErrorMessage}`);
      }

      return resume;
    }
  }

  async enhanceResume(
    userId: string,
    file: Express.Multer.File,
    enhanceResumeDto: EnhanceResumeDto,
  ) {
    if (!file) {
      throw new BadRequestException('A resume file is required.');
    }

    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.pdf',
      '.doc',
      '.docx',
    ];
    const originalName = file.originalname?.toLowerCase() || '';
    const isExtensionValid = allowedExtensions.some((ext) =>
      originalName.endsWith(ext),
    );

    if (!isExtensionValid) {
      throw new BadRequestException(
        'Unsupported file format. Please upload a file with format: JPEG, PNG, PDF, DOC, DOCX.',
      );
    }

    const jobDescription = await this.resolveJobDescription(enhanceResumeDto);
    const template = this.resolveResumeTemplate(enhanceResumeDto.template);

    const formData = new FormData();
    const blob = new Blob([Uint8Array.from(file.buffer)], {
      type: file.mimetype || 'application/octet-stream',
    });
    formData.append('file', blob, file.originalname || 'resume');
    formData.append('jobDescription', jobDescription);
    formData.append('language', enhanceResumeDto.language);

    const aiCandidateUrls = this.getAiServiceBaseUrls();
    const aiTimeoutMs = this.getAiTimeoutMs();

    let response: { data?: any } | null = null;
    let lastNetworkError: unknown = null;

    for (const baseUrl of aiCandidateUrls) {
      try {
        response = await axios.post(
          `${baseUrl}/api/ai/enhance-resume`,
          formData,
          {
            timeout: aiTimeoutMs,
            proxy: false,
          },
        );
        break;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          throw err;
        }
        lastNetworkError = err;
        this.logger.warn(`AI enhance endpoint failed: ${baseUrl}`);
      }
    }

    if (!response) {
      throw this.aiUnavailable(lastNetworkError);
    }

    const aiContent = response.data?.data?.content as Prisma.InputJsonValue;
    if (!aiContent) {
      throw new HttpException(
        'AI service returned an invalid payload for resume enhancement.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const visualContent = this.applyTemplateToContent(aiContent, template);

    const resume = await this.prisma.resume.create({
      data: {
        candidateId: userId,
        title: enhanceResumeDto.title,
        language: enhanceResumeDto.language as any,
        jobDescription,
        content: visualContent,
      },
    });

    try {
      const atsScore = await this.requestAtsScore(
        visualContent,
        jobDescription,
      );

      return await this.prisma.resume.update({
        where: { id: resume.id },
        data: { atsScore: atsScore as unknown as Prisma.InputJsonValue },
      });
    } catch (error) {
      this.logger.warn(
        `ATS score could not be computed for enhanced resume ${resume.id}`,
      );

      return resume;
    }
  }

  async findAll(userId: string) {
    return this.prisma.resume.findMany({
      where: { candidateId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, candidateId: userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    return resume;
  }

  async update(id: string, userId: string, updateResumeDto: UpdateResumeDto) {
    await this.findOne(id, userId);
    return this.prisma.resume.update({
      where: { id },
      data: {
        title: updateResumeDto.title,
        content: updateResumeDto.content,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.resume.delete({
      where: { id },
    });
    return { message: 'Resume deleted successfully' };
  }

  async scoreResume(id: string, userId: string) {
    const resume = await this.findOne(id, userId);
    const atsScore = await this.requestAtsScore(
      resume.content,
      resume.jobDescription,
    );

    await this.prisma.resume.update({
      where: { id },
      data: { atsScore: atsScore as unknown as Prisma.InputJsonValue },
    });

    return atsScore;
  }

  async optimizeResume(id: string, userId: string, dto: OptimizeResumeDto) {
    const resume = await this.findOne(id, userId);

    const aiCandidateUrls = this.getAiServiceBaseUrls();
    const aiTimeoutMs = this.getAiTimeoutMs();

    let response: { data?: any } | null = null;
    let lastNetworkError: unknown = null;

    const payload = {
      resumeContent: dto.resumeContent || resume.content,
      missingKeywords: dto.missingKeywords ?? [],
      suggestions: dto.suggestions ?? [],
      jobDescription: resume.jobDescription,
      language: resume.language ? resume.language.toLowerCase() : 'en',
    };

    for (const baseUrl of aiCandidateUrls) {
      try {
        response = await axios.post(
          `${baseUrl}/api/ai/optimize-resume`,
          payload,
          {
            timeout: aiTimeoutMs,
            proxy: false,
          },
        );
        break;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          throw err;
        }
        lastNetworkError = err;
        this.logger.warn(`Resume optimization endpoint failed: ${baseUrl}`);
      }
    }

    if (!response) {
      throw this.aiUnavailable(lastNetworkError);
    }

    const data = response.data?.data;
    if (!data?.optimizedContent) {
      throw new HttpException(
        'AI service returned an invalid resume optimization payload.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      optimizedContent: data.optimizedContent,
      addedKeywords: data.addedKeywords || [],
      modifiedSections: data.modifiedSections || [],
      summaryOfChanges: data.summaryOfChanges || '',
    };
  }
}
