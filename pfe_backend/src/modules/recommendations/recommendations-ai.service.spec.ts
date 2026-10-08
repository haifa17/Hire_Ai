import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { RecommendationsAiService } from './recommendations-ai.service';

jest.mock('axios');

describe('RecommendationsAiService', () => {
  let service: RecommendationsAiService;
  const configService = { get: jest.fn(() => undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn(() => false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsAiService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<RecommendationsAiService>(RecommendationsAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('recommendJobsForCandidate returns the AI response data', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      status: 200,
      data: { data: { recommendations: [] } },
    });

    const result = await service.recommendJobsForCandidate('c1', {}, 5, 'en');

    expect(result).toEqual({ recommendations: [] });
  });

  it('indexJobs delegates to the AI service', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      status: 200,
      data: { indexed: 2, total: 2 },
    });

    const result = await service.indexJobs([{ id: 'job-1' }]);

    expect(result).toEqual({ indexed: 2, total: 2 });
  });

  it('throws BadGatewayException when the AI service is unreachable', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      service.recommendCandidatesForJob('job-1', {}, 5, 'en'),
    ).rejects.toThrow(BadGatewayException);
  });
});
