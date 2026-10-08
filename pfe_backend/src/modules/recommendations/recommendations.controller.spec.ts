import { Test, TestingModule } from '@nestjs/testing';

import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  const service = {
    getJobRecommendations: jest.fn(),
    refreshJobRecommendations: jest.fn(),
    getCandidateRecommendations: jest.fn(),
    refreshCandidateRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [{ provide: RecommendationsService, useValue: service }],
    }).compile();

    controller = module.get<RecommendationsController>(
      RecommendationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getJobRecommendations applies default topK and language', async () => {
    service.getJobRecommendations.mockResolvedValue({ recommendations: [] });

    const result = await controller.getJobRecommendations(
      'candidate-1',
      {} as any,
    );

    expect(service.getJobRecommendations).toHaveBeenCalledWith(
      'candidate-1',
      10,
      'en',
    );
    expect(result).toEqual({ recommendations: [] });
  });

  it('refreshJobRecommendations forwards provided topK/language', async () => {
    service.refreshJobRecommendations.mockResolvedValue({});

    await controller.refreshJobRecommendations('candidate-1', {
      topK: 5,
      language: 'fr',
    } as any);

    expect(service.refreshJobRecommendations).toHaveBeenCalledWith(
      'candidate-1',
      5,
      'fr',
    );
  });

  it('getCandidateRecommendations applies default topK and language', async () => {
    service.getCandidateRecommendations.mockResolvedValue({});

    await controller.getCandidateRecommendations('job-1', {} as any);

    expect(service.getCandidateRecommendations).toHaveBeenCalledWith(
      'job-1',
      10,
      'en',
    );
  });

  it('refreshCandidateRecommendations forwards provided topK/language', async () => {
    service.refreshCandidateRecommendations.mockResolvedValue({});

    await controller.refreshCandidateRecommendations('job-1', {
      topK: 3,
      language: 'es',
    } as any);

    expect(service.refreshCandidateRecommendations).toHaveBeenCalledWith(
      'job-1',
      3,
      'es',
    );
  });
});
