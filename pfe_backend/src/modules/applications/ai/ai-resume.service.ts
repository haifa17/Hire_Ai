import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class AiResumeService {
  // Placeholder: return mock analysis for a resume
  analyze(bufferOrUrl: any) {
    return {
      // Math.random() is not cryptographically secure; use the CSPRNG-backed
      // crypto.randomInt even for this mock value.
      matchPercentage: 60 + randomInt(41),
      missingSkills: ['TypeScript', 'NestJS'],
      strengths: ['Communication', 'Problem solving'],
    };
  }
}
