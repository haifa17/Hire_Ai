import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobOfferStatus, Role } from '@prisma/client';

import { JobOffersService } from './job-offers.service';
import { PrismaService } from '../../database/prisma.service';
import { JobOffersAiService } from './job-offers-ai.service';
import { RecommendationsService } from '../recommendations/recommendations.service';

describe('JobOffersService', () => {
  let service: JobOffersService;

  const prisma = {
    recruiterProfile: { findUnique: jest.fn() },
    jobOffer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    application: { findMany: jest.fn() },
  };

  const aiService = { generateFromPrompt: jest.fn() };
  const recommendationsService = {
    triggerCandidateRecommendations: jest.fn().mockResolvedValue(undefined),
  };

  const recruiter: any = { id: 'recruiter-1', role: Role.RECRUITER };

  beforeEach(async () => {
    jest.clearAllMocks();
    recommendationsService.triggerCandidateRecommendations.mockResolvedValue(
      undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOffersService,
        { provide: PrismaService, useValue: prisma },
        { provide: JobOffersAiService, useValue: aiService },
        { provide: RecommendationsService, useValue: recommendationsService },
      ],
    }).compile();

    service = module.get<JobOffersService>(JobOffersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws BadRequestException when recruiter has no company', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.create(recruiter, { title: 'Engineer' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an invalid salary range', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        companyId: 'company-1',
      });

      await expect(
        service.create(recruiter, {
          title: 'Engineer',
          salaryMin: 100,
          salaryMax: 50,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a job offer with a unique slug', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        companyId: 'company-1',
      });
      prisma.jobOffer.findUnique.mockResolvedValue(null);
      prisma.jobOffer.create.mockResolvedValue({ id: 'job-1' });

      const result = await service.create(recruiter, {
        title: 'Backend Engineer',
        location: 'Remote',
        country: 'US',
        city: 'NYC',
        description: 'desc',
      } as any);

      expect(prisma.jobOffer.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'job-1' });
    });
  });

  describe('aiGenerate', () => {
    it('delegates to the AI service', async () => {
      aiService.generateFromPrompt.mockResolvedValue({ title: 'AI job' });

      const result = await service.aiGenerate({ prompt: 'a job' } as any);

      expect(aiService.generateFromPrompt).toHaveBeenCalledWith(
        'a job',
        undefined,
      );
      expect(result).toEqual({ title: 'AI job' });
    });
  });

  describe('findOneOwned', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue(null);

      await expect(service.findOneOwned('job-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the job offer when found', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({ id: 'job-1' });

      const result = await service.findOneOwned('job-1');
      expect(result).toEqual({ id: 'job-1' });
    });
  });

  describe('publish', () => {
    it('publishes a draft job offer and triggers recommendations', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        status: JobOfferStatus.DRAFT,
      });
      prisma.jobOffer.update.mockResolvedValue({
        id: 'job-1',
        status: JobOfferStatus.PUBLISHED,
      });

      const result = await service.publish('job-1');

      expect(result.status).toBe(JobOfferStatus.PUBLISHED);
      expect(
        recommendationsService.triggerCandidateRecommendations,
      ).toHaveBeenCalledWith('job-1');
    });

    it('returns the existing job offer if already published', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        status: JobOfferStatus.PUBLISHED,
      });

      const result = await service.publish('job-1');

      expect(prisma.jobOffer.update).not.toHaveBeenCalled();
      expect(result.status).toBe(JobOfferStatus.PUBLISHED);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a missing job offer', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue(null);

      await expect(service.remove('job-1')).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes the job offer', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({ id: 'job-1' });
      prisma.jobOffer.update.mockResolvedValue({});

      const result = await service.remove('job-1');

      expect(prisma.jobOffer.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: JobOfferStatus.CLOSED }),
      });
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('analytics', () => {
    it('computes conversion rate', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        status: JobOfferStatus.PUBLISHED,
        views: 100,
        applicationsCount: 10,
        urgent: false,
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.analytics('job-1');

      expect(result.conversionRate).toBe(10);
    });
  });

  describe('findPublic', () => {
    it('returns paginated public job offers', async () => {
      prisma.jobOffer.findMany.mockResolvedValue([{ id: 'job-1' }]);
      prisma.jobOffer.count.mockResolvedValue(1);

      const result = await service.findPublic({} as any);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
