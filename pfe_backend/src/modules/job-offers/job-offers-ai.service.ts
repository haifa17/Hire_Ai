import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiGeneratedJobOfferResponseDto } from './dto/ai-generate-job-offer.dto';

@Injectable()
export class JobOffersAiService {
  constructor(private readonly configService: ConfigService) {}

  async generateFromPrompt(
    prompt: string,
    language = 'EN',
  ): Promise<AiGeneratedJobOfferResponseDto> {
    const baseUrls = this.getAiServiceBaseUrls();
    const timeoutMs = this.getAiTimeoutMs();

    let response: { data?: any } | null = null;

    for (const baseUrl of baseUrls) {
      try {
        response = await axios.post(
          `${baseUrl}/api/ai/generate-job-offer`,
          { prompt, language: language.toUpperCase() },
          {
            timeout: timeoutMs,
            proxy: false,
          },
        );
        break;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const responseMessage = (
            error.response.data as { message?: string } | undefined
          )?.message;
          throw new BadGatewayException(
            responseMessage ??
              'AI service returned an invalid job offer response.',
          );
        }
      }
    }

    if (!response) {
      throw new BadGatewayException(
        'AI service is unavailable for job offer generation.',
      );
    }

    const content = response.data?.data?.content as
      | AiGeneratedJobOfferResponseDto
      | undefined;

    if (!content || typeof content !== 'object') {
      throw new BadGatewayException(
        'AI service returned an invalid job offer payload.',
      );
    }

    return content;
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
