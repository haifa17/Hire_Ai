import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { JobOffersAiService } from './job-offers-ai.service';

jest.mock('axios');

describe('JobOffersAiService', () => {
  let service: JobOffersAiService;
  const configService = { get: jest.fn(() => undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn(() => false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOffersAiService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<JobOffersAiService>(JobOffersAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the generated content on success', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { data: { content: { title: 'Backend Engineer' } } },
    });

    const result = await service.generateFromPrompt('a backend job');

    expect(result).toEqual({ title: 'Backend Engineer' });
  });

  it('throws BadGatewayException when the AI service is unreachable', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.generateFromPrompt('prompt')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('throws BadGatewayException when the response has no content', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });

    await expect(service.generateFromPrompt('prompt')).rejects.toThrow(
      BadGatewayException,
    );
  });
});
