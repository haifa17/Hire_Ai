import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResumesService } from './resumes.service';
import { PrismaService } from '../../database/prisma.service';

describe('ResumesService', () => {
  let service: ResumesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<ResumesService>(ResumesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
