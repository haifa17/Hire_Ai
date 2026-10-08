import { Test, TestingModule } from '@nestjs/testing';
import { AiResumeService } from './ai-resume.service';

describe('AiResumeService', () => {
  let service: AiResumeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiResumeService],
    }).compile();

    service = module.get<AiResumeService>(AiResumeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('analyze returns a mock analysis payload', () => {
    const result = service.analyze('some-cv-url');

    expect(result.matchPercentage).toBeGreaterThanOrEqual(60);
    expect(result.matchPercentage).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.missingSkills)).toBe(true);
    expect(Array.isArray(result.strengths)).toBe(true);
  });
});
