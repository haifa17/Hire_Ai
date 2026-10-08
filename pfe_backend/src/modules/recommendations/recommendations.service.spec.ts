import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../../database/prisma.service';
import { RecommendationsAiService } from './recommendations-ai.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const prisma = {
    recommendation: { findMany: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    jobOffer: { findFirst: jest.fn(), findMany: jest.fn() },
  };

  const aiService = {
    refreshJobRecommendations: jest.fn(),
    refreshCandidateRecommendations: jest.fn(),
    recommendCandidatesForJob: jest.fn(),
    indexJobs: jest.fn(),
    indexCandidates: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    aiService.recommendCandidatesForJob.mockResolvedValue({});
    aiService.indexJobs.mockResolvedValue({ indexed: 0, total: 0 });
    aiService.indexCandidates.mockResolvedValue({ indexed: 0, total: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RecommendationsAiService, useValue: aiService },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getJobRecommendations', () => {
    it('returns cached recommendations when they exist', async () => {
      prisma.recommendation.findMany.mockResolvedValue([
        {
          rank: 1,
          targetId: 'job-1',
          targetType: 'job',
          overallScore: 0.9,
          scoreBreakdown: {},
          explanation: 'good match',
          metadataPayload: {},
          createdAt: new Date(),
        },
      ]);

      const result = await service.getJobRecommendations('candidate-1');

      expect(result.cached).toBe(true);
      expect(result.recommendations).toHaveLength(1);
    });

    it('triggers background generation when nothing cached', async () => {
      prisma.recommendation.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({
        id: 'candidate-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        candidateProfile: null,
      });
      prisma.jobOffer.findMany.mockResolvedValue([]);
      aiService.refreshJobRecommendations.mockResolvedValue({
        recommendations: [],
      });

      const result = await service.getJobRecommendations('candidate-1');

      expect(result.generating).toBe(true);
      expect(result.cached).toBe(false);
    });
  });

  describe('refreshJobRecommendations', () => {
    it('throws NotFoundException for a missing candidate', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshJobRecommendations('missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('builds profile and calls the AI service', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'candidate-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        candidateProfile: { desiredSalary: null },
      });
      prisma.jobOffer.findMany.mockResolvedValue([]);
      aiService.refreshJobRecommendations.mockResolvedValue({
        recommendations: [{ id: 'r1' }],
      });

      const result = await service.refreshJobRecommendations('candidate-1');

      expect(aiService.refreshJobRecommendations).toHaveBeenCalled();
      expect(result).toEqual({ recommendations: [{ id: 'r1' }] });
    });
  });

  describe('refreshCandidateRecommendations', () => {
    it('throws NotFoundException for a missing job offer', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue(null);

      await expect(
        service.refreshCandidateRecommendations('missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('builds job payload and calls the AI service', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        title: 'Engineer',
        company: {},
        recruiter: {},
      });
      prisma.user.findMany.mockResolvedValue([]);
      aiService.refreshCandidateRecommendations.mockResolvedValue({
        recommendations: [],
      });

      const result = await service.refreshCandidateRecommendations('job-1');

      expect(aiService.refreshCandidateRecommendations).toHaveBeenCalled();
      expect(result).toEqual({ recommendations: [] });
    });
  });

  describe('triggerCandidateRecommendations', () => {
    it('indexes jobs/candidates and fires the AI recommendation call', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        title: 'Engineer',
        company: {},
        recruiter: {},
      });
      prisma.user.findMany.mockResolvedValue([]);

      await service.triggerCandidateRecommendations('job-1');

      expect(aiService.indexJobs).toHaveBeenCalled();
      expect(aiService.recommendCandidatesForJob).toHaveBeenCalled();
    });

    it('swallows errors when the job offer is missing', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue(null);

      await expect(
        service.triggerCandidateRecommendations('missing'),
      ).resolves.toBeUndefined();
    });
  });
});
