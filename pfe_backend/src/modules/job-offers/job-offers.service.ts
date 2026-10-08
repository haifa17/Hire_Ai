import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobOffer, JobOfferStatus, Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { QueryJobOffersDto } from './dto/query-job-offers.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import {
  AiGenerateJobOfferDto,
  AiGeneratedJobOfferResponseDto,
} from './dto/ai-generate-job-offer.dto';
import { JobOffersAiService } from './job-offers-ai.service';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class JobOffersService {
  private readonly viewedJobKeys = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: JobOffersAiService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async create(user: User, dto: CreateJobOfferDto): Promise<JobOffer> {
    const recruiterContext = await this.getRecruiterContext(user.id);

    if (!recruiterContext) {
      throw new BadRequestException(
        'Recruiter profile with company is required to create a job offer.',
      );
    }

    this.validateSalaryRange(dto.salaryMin, dto.salaryMax);

    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.jobOffer.create({
      data: {
        companyId: recruiterContext.companyId,
        recruiterId: user.id,
        title: dto.title.trim(),
        slug,
        department: dto.department?.trim(),
        employmentType: dto.employmentType,
        workplaceType: dto.workplaceType,
        location: dto.location.trim(),
        country: dto.country.trim(),
        city: dto.city.trim(),
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        currency: dto.currency?.trim().toUpperCase() || 'USD',
        experienceLevel: dto.experienceLevel,
        educationLevel: dto.educationLevel,
        description: dto.description.trim(),
        responsibilities: this.cleanArray(dto.responsibilities),
        requirements: this.cleanArray(dto.requirements),
        preferredSkills: this.cleanArray(dto.preferredSkills),
        requiredSkills: this.cleanArray(dto.requiredSkills),
        benefits: this.cleanArray(dto.benefits),
        languages: this.cleanArray(dto.languages),
        openings: dto.openings ?? 1,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        featured: dto.featured ?? false,
        urgent: dto.urgent ?? false,
      },
    });
  }

  async aiGenerate(
    dto: AiGenerateJobOfferDto,
  ): Promise<AiGeneratedJobOfferResponseDto> {
    return this.aiService.generateFromPrompt(dto.prompt, dto.language);
  }

  async findPublic(query: QueryJobOffersDto) {
    const where = this.buildWhere(query, false);
    const [items, total] = await this.findWithPagination(where, query);

    return {
      items,
      pagination: this.paginationMeta(
        total,
        query.page ?? 1,
        query.limit ?? 10,
      ),
    };
  }

  async findCompanyMine(user: User, query: QueryJobOffersDto) {
    const recruiterContext = await this.getRecruiterContext(user.id);
    if (!recruiterContext && user.role !== Role.ADMIN) {
      throw new BadRequestException('Recruiter profile is missing.');
    }

    const where: Prisma.JobOfferWhereInput = this.buildWhere(query, true);

    if (user.role === Role.RECRUITER) {
      where.companyId = recruiterContext?.companyId;
      where.recruiterId = user.id;
    }

    const [items, total] = await this.findWithPagination(where, query);

    return {
      items,
      pagination: this.paginationMeta(
        total,
        query.page ?? 1,
        query.limit ?? 10,
      ),
    };
  }

  async findAdminAll(query: QueryJobOffersDto) {
    const where: Prisma.JobOfferWhereInput = this.buildWhere(query, true);
    const [items, total] = await this.findWithPagination(where, query);

    return {
      items,
      pagination: this.paginationMeta(
        total,
        query.page ?? 1,
        query.limit ?? 10,
      ),
    };
  }

  async findOneOwned(id: string) {
    const jobOffer = await this.prisma.jobOffer.findFirst({
      where: { id, deletedAt: null },
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
      throw new NotFoundException('Job offer not found.');
    }

    return jobOffer;
  }

  async findBySlug(slug: string, user?: User, clientIp?: string) {
    const jobOffer = await this.prisma.jobOffer.findFirst({
      where: {
        slug,
        status: JobOfferStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            description: true,
            companySize: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!jobOffer) {
      throw new NotFoundException('Published job offer not found.');
    }

    const updatedViews = await this.recordUniqueView(
      jobOffer.id,
      jobOffer.recruiterId,
      jobOffer.views,
      user,
      clientIp,
    );

    return {
      ...jobOffer,
      views: updatedViews,
    };
  }

  async findPublicById(id: string, user?: User, clientIp?: string) {
    const jobOffer = await this.prisma.jobOffer.findFirst({
      where: {
        id,
        status: JobOfferStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            description: true,
            companySize: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!jobOffer) {
      throw new NotFoundException('Published job offer not found.');
    }

    const updatedViews = await this.recordUniqueView(
      jobOffer.id,
      jobOffer.recruiterId,
      jobOffer.views,
      user,
      clientIp,
    );

    return {
      ...jobOffer,
      views: updatedViews,
    };
  }

  private async recordUniqueView(
    jobOfferId: string,
    recruiterId: string,
    currentViews: number,
    user?: User,
    clientIp?: string,
  ): Promise<number> {
    // 1. Do not count views if the user is the recruiter who created the job offer or an admin
    if (user && (user.id === recruiterId || user.role === Role.ADMIN)) {
      return currentViews;
    }

    // 2. Track unique view per user ID or client IP session
    const viewerIdentifier = user?.id || clientIp || 'anonymous';
    const viewKey = `${viewerIdentifier}:${jobOfferId}`;
    const now = Date.now();
    const lastViewedAt = this.viewedJobKeys.get(viewKey);

    // If key exists and was viewed within 24 hours, do not increment
    if (lastViewedAt && now - lastViewedAt < 86_400_000) {
      return currentViews;
    }

    // Record view key timestamp
    this.viewedJobKeys.set(viewKey, now);

    // Clean up old entries if map gets large (>10,000 items)
    if (this.viewedJobKeys.size > 10_000) {
      for (const [key, timestamp] of this.viewedJobKeys.entries()) {
        if (now - timestamp > 86_400_000) {
          this.viewedJobKeys.delete(key);
        }
      }
    }

    // Increment in DB
    await this.prisma.jobOffer.update({
      where: { id: jobOfferId },
      data: { views: { increment: 1 } },
    });

    return currentViews + 1;
  }

  async update(id: string, dto: UpdateJobOfferDto) {
    const existing = await this.findExisting(id);

    this.validateSalaryRange(dto.salaryMin ?? null, dto.salaryMax ?? null);

    const nextTitle = dto.title?.trim();
    const slug =
      nextTitle && nextTitle !== existing.title
        ? await this.generateUniqueSlug(nextTitle, existing.id)
        : undefined;

    return this.prisma.jobOffer.update({
      where: { id },
      data: {
        title: nextTitle,
        slug,
        department: dto.department?.trim(),
        employmentType: dto.employmentType,
        workplaceType: dto.workplaceType,
        location: dto.location?.trim(),
        country: dto.country?.trim(),
        city: dto.city?.trim(),
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        currency: dto.currency?.trim().toUpperCase(),
        experienceLevel: dto.experienceLevel,
        educationLevel: dto.educationLevel,
        description: dto.description?.trim(),
        responsibilities: dto.responsibilities
          ? this.cleanArray(dto.responsibilities)
          : undefined,
        requirements: dto.requirements
          ? this.cleanArray(dto.requirements)
          : undefined,
        preferredSkills: dto.preferredSkills
          ? this.cleanArray(dto.preferredSkills)
          : undefined,
        requiredSkills: dto.requiredSkills
          ? this.cleanArray(dto.requiredSkills)
          : undefined,
        benefits: dto.benefits ? this.cleanArray(dto.benefits) : undefined,
        languages: dto.languages ? this.cleanArray(dto.languages) : undefined,
        openings: dto.openings,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        featured: dto.featured,
        urgent: dto.urgent,
      },
    });
  }

  async publish(id: string) {
    const existing = await this.findExisting(id);
    if (existing.status === JobOfferStatus.PUBLISHED) {
      return existing;
    }

    const published = await this.prisma.jobOffer.update({
      where: { id },
      data: {
        status: JobOfferStatus.PUBLISHED,
      },
    });

    // Auto-trigger candidate recommendations (fire-and-forget)
    this.recommendationsService
      .triggerCandidateRecommendations(id)
      .catch(() => {
        /* swallow – non-critical */
      });

    return published;
  }

  async close(id: string) {
    await this.findExisting(id);
    return this.prisma.jobOffer.update({
      where: { id },
      data: {
        status: JobOfferStatus.CLOSED,
      },
    });
  }

  async remove(id: string) {
    await this.findExisting(id);

    await this.prisma.jobOffer.update({
      where: { id },
      data: {
        status: JobOfferStatus.CLOSED,
        deletedAt: new Date(),
      },
    });

    return { message: 'Job offer deleted successfully', data: { id } };
  }

  async analytics(id: string) {
    const jobOffer = await this.findExisting(id);

    const conversionRate =
      jobOffer.views > 0
        ? Number(
            ((jobOffer.applicationsCount / jobOffer.views) * 100).toFixed(2),
          )
        : 0;

    return {
      id: jobOffer.id,
      status: jobOffer.status,
      views: jobOffer.views,
      applicationsCount: jobOffer.applicationsCount,
      conversionRate,
      isUrgent: jobOffer.urgent,
      isFeatured: jobOffer.featured,
      createdAt: jobOffer.createdAt,
      updatedAt: jobOffer.updatedAt,
    };
  }

  async topCandidates(id: string, limit = 10) {
    const jobOffer = await this.findOneOwned(id);

    const applications = await this.prisma.application.findMany({
      where: { jobOfferId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
            candidateProfile: {
              select: {
                professionalSummary: true,
                skills: true,
              },
            },
          },
        },
      },
    });

    const ranked = applications
      .map((application) => ({
        ...application,
        matchScore: this.extractMatchScore(application.aiAnalysis),
      }))
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, limit)
      .map((application, index) => ({
        rank: index + 1,
        application,
      }));

    return {
      jobOffer: {
        id: jobOffer.id,
        title: jobOffer.title,
        company: jobOffer.company,
        location: jobOffer.location,
        city: jobOffer.city,
        country: jobOffer.country,
      },
      items: ranked,
    };
  }

  private async getRecruiterContext(userId: string) {
    return this.prisma.recruiterProfile.findUnique({
      where: { userId },
      select: { companyId: true },
    });
  }

  private cleanArray(items?: string[]): string[] {
    if (!items) return [];
    return items.map((item) => item.trim()).filter((item) => item.length > 0);
  }

  private validateSalaryRange(
    salaryMin?: number | null,
    salaryMax?: number | null,
  ) {
    if (
      salaryMin !== undefined &&
      salaryMin !== null &&
      salaryMax !== undefined &&
      salaryMax !== null &&
      salaryMin > salaryMax
    ) {
      throw new BadRequestException(
        'salaryMin cannot be greater than salaryMax.',
      );
    }
  }

  private async findExisting(id: string) {
    const jobOffer = await this.prisma.jobOffer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found.');
    }

    return jobOffer;
  }

  private buildWhere(
    query: QueryJobOffersDto,
    includeNonPublished: boolean,
  ): Prisma.JobOfferWhereInput {
    const where: Prisma.JobOfferWhereInput = {
      deletedAt: null,
    };

    this.applyStatusFilter(where, query, includeNonPublished);
    this.applySearchFilter(where, query);
    this.applySimpleFilters(where, query);
    this.applySalaryFilters(where, query);

    return where;
  }

  private applyStatusFilter(
    where: Prisma.JobOfferWhereInput,
    query: QueryJobOffersDto,
    includeNonPublished: boolean,
  ) {
    if (!includeNonPublished) {
      where.status = JobOfferStatus.PUBLISHED;
      return;
    }

    if (query.status) {
      where.status = query.status;
    }
  }

  private applySearchFilter(
    where: Prisma.JobOfferWhereInput,
    query: QueryJobOffersDto,
  ) {
    if (!query.search) return;

    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { city: { contains: query.search, mode: 'insensitive' } },
      { country: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  private applySimpleFilters(
    where: Prisma.JobOfferWhereInput,
    query: QueryJobOffersDto,
  ) {
    if (query.employmentType) where.employmentType = query.employmentType;
    if (query.workplaceType) where.workplaceType = query.workplaceType;
    if (query.experienceLevel) where.experienceLevel = query.experienceLevel;
    if (query.country)
      where.country = { equals: query.country, mode: 'insensitive' };
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.urgent !== undefined) where.urgent = query.urgent;
    if (query.featured !== undefined) where.featured = query.featured;
  }

  private applySalaryFilters(
    where: Prisma.JobOfferWhereInput,
    query: QueryJobOffersDto,
  ) {
    if (query.minSalary === undefined && query.maxSalary === undefined) {
      return;
    }

    const salaryFilters: Prisma.JobOfferWhereInput[] = [];

    if (query.minSalary !== undefined) {
      salaryFilters.push({
        salaryMin: {
          gte: query.minSalary,
        },
      });
    }

    if (query.maxSalary !== undefined) {
      salaryFilters.push({
        salaryMax: {
          lte: query.maxSalary,
        },
      });
    }

    let existingAnd: Prisma.JobOfferWhereInput[] = [];
    if (where.AND) {
      existingAnd = Array.isArray(where.AND) ? where.AND : [where.AND];
    }

    where.AND = [...existingAnd, ...salaryFilters];
  }

  private async findWithPagination(
    where: Prisma.JobOfferWhereInput,
    query: QueryJobOffersDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.JobOfferOrderByWithRelationInput = {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };

    return Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              industry: true,
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
      }),
      this.prisma.jobOffer.count({ where }),
    ]);
  }

  private paginationMeta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  private slugify(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extractMatchScore(aiAnalysis: unknown): number {
    if (!aiAnalysis || typeof aiAnalysis !== 'object') {
      return 0;
    }

    const analysis = aiAnalysis as Record<string, unknown>;
    const rawScore =
      analysis.matchScore ??
      analysis.globalScore ??
      analysis.score ??
      analysis.atsScore ??
      analysis.matchPercentage;

    if (typeof rawScore === 'number') {
      return Math.max(0, Math.min(100, Math.round(rawScore)));
    }

    if (typeof rawScore === 'string') {
      const parsed = Number.parseFloat(rawScore);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }

    return 0;
  }

  private async generateUniqueSlug(title: string, currentId?: string) {
    const baseSlug = this.slugify(title) || 'job-offer';
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.jobOffer.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === currentId) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }
}
