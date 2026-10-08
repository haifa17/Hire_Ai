import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import axios from 'axios';

import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../database/prisma.service';

jest.mock('axios');

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    jobOffer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    application: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const configService = {
    get: jest.fn(() => undefined),
  };

  const candidate: any = {
    id: 'candidate-1',
    role: Role.CANDIDATE,
  };

  const recruiter: any = {
    id: 'recruiter-1',
    role: Role.RECRUITER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('apply', () => {
    it('throws BadRequestException when no CV file is provided', async () => {
      await expect(
        service.apply(candidate, { jobOfferId: 'job-1' } as any, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when job is not published', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue(null);

      await expect(
        service.apply(candidate, { jobOfferId: 'job-1' } as any, {
          cv: [{ path: '/tmp/cv.pdf', originalname: 'cv.pdf' } as any],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when already applied', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({ id: 'job-1' });
      prisma.application.findFirst.mockResolvedValue({ id: 'existing-app' });

      await expect(
        service.apply(candidate, { jobOfferId: 'job-1' } as any, {
          cv: [{ path: '/tmp/cv.pdf', originalname: 'cv.pdf' } as any],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates an application when valid', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({ id: 'job-1' });
      prisma.application.findFirst.mockResolvedValue(null);
      prisma.application.create.mockResolvedValue({ id: 'app-1' });
      prisma.jobOffer.update.mockResolvedValue({});
      prisma.application.findUnique.mockResolvedValue(null);
      (axios.post as jest.Mock).mockRejectedValue(new Error('network down'));

      const result = await service.apply(
        candidate,
        { jobOfferId: 'job-1' } as any,
        {
          cv: [
            {
              path: '/tmp/cv.pdf',
              originalname: 'cv.pdf',
              mimetype: 'application/pdf',
              size: 123,
              filename: 'cv.pdf',
            } as any,
          ],
        },
      );

      expect(prisma.application.create).toHaveBeenCalled();
      expect(prisma.jobOffer.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { applicationsCount: { increment: 1 } },
      });
      expect(result).toEqual({ id: 'app-1' });
    });
  });

  describe('previewMatching', () => {
    it('returns the matching result from the AI service', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { matchingResult: { score: 0.9 } } },
      });

      const result = await service.previewMatching({} as any);

      expect(result).toEqual({ score: 0.9 });
    });

    it('returns null when the AI service is unreachable', async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.previewMatching({} as any);

      expect(result).toBeNull();
    });
  });

  describe('findApplicantsForJob', () => {
    it('throws NotFoundException when job is missing', async () => {
      prisma.jobOffer.findUnique.mockResolvedValue(null);

      await expect(
        service.findApplicantsForJob(recruiter, 'job-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when recruiter does not own the job', async () => {
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'someone-else',
      });

      await expect(
        service.findApplicantsForJob(recruiter, 'job-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns applicants for the owning recruiter', async () => {
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'recruiter-1',
      });
      prisma.application.findMany.mockResolvedValue([{ id: 'app-1' }]);

      const result = await service.findApplicantsForJob(recruiter, 'job-1');

      expect(result).toEqual([{ id: 'app-1' }]);
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when application missing', async () => {
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(recruiter, 'app-1', 'ACCEPTED' as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a non-owning recruiter', async () => {
      prisma.application.findUnique.mockResolvedValue({
        id: 'app-1',
        jobOfferId: 'job-1',
      });
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'someone-else',
      });

      await expect(
        service.updateStatus(recruiter, 'app-1', 'ACCEPTED' as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates status for the owning recruiter', async () => {
      prisma.application.findUnique.mockResolvedValue({
        id: 'app-1',
        jobOfferId: 'job-1',
      });
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'recruiter-1',
      });
      prisma.application.update.mockResolvedValue({
        id: 'app-1',
        status: 'ACCEPTED',
      });

      const result = await service.updateStatus(
        recruiter,
        'app-1',
        'ACCEPTED' as any,
      );

      expect(result.status).toBe('ACCEPTED');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.findOne(candidate, 'app-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows the owning candidate', async () => {
      prisma.application.findUnique.mockResolvedValue({
        id: 'app-1',
        candidateId: 'candidate-1',
        jobOfferId: 'job-1',
      });
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'recruiter-1',
      });

      const result = await service.findOne(candidate, 'app-1');
      expect(result.id).toBe('app-1');
    });

    it('throws ForbiddenException for an unrelated candidate', async () => {
      prisma.application.findUnique.mockResolvedValue({
        id: 'app-1',
        candidateId: 'other-candidate',
        jobOfferId: 'job-1',
      });
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'recruiter-1',
      });

      await expect(service.findOne(candidate, 'app-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('withdraw', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(service.withdraw(candidate, 'app-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for a non-owner', async () => {
      prisma.application.findUnique.mockResolvedValue({
        id: 'app-1',
        candidateId: 'other-candidate',
      });

      await expect(service.withdraw(candidate, 'app-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes the application and decrements the job counter', async () => {
      prisma.application.findUnique.mockResolvedValue({
        id: 'app-1',
        candidateId: 'candidate-1',
        jobOfferId: 'job-1',
      });
      prisma.application.delete.mockResolvedValue({});
      prisma.jobOffer.update.mockResolvedValue({});

      const result = await service.withdraw(candidate, 'app-1');

      expect(prisma.application.delete).toHaveBeenCalledWith({
        where: { id: 'app-1' },
      });
      expect(result.message).toBe('Application withdrawn');
    });
  });

  describe('matchOffer', () => {
    const profiledCandidate = {
      id: 'candidate-1',
      firstName: 'Lina',
      lastName: 'Haddad',
      email: 'lina@example.com',
      phone: null,
      address: 'Tunis',
      candidateProfile: {
        professionalSummary: 'Frontend developer',
        experiences: [],
        education: [],
        skills: ['React', 'TypeScript'],
        languages: [],
        certifications: [],
      },
    };

    const externalOffer = {
      title: 'Senior Frontend Engineer',
      company: 'Acme',
      description: 'We are looking for a senior frontend engineer. '.repeat(3),
    };

    const aiResult = { globalScore: 82, matchedSkills: ['React'] };

    it('rejects a request with neither or both offer sources', async () => {
      await expect(service.matchOffer(candidate, {} as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.matchOffer(candidate, {
          jobOfferId: 'job-1',
          externalOffer,
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('requires a candidate profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...profiledCandidate,
        candidateProfile: null,
      });

      await expect(
        service.matchOffer(candidate, { externalOffer } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('only matches published platform offers', async () => {
      prisma.user.findUnique.mockResolvedValue(profiledCandidate);
      prisma.jobOffer.findFirst.mockResolvedValue(null);

      await expect(
        service.matchOffer(candidate, { jobOfferId: 'job-1' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.jobOffer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1', status: 'PUBLISHED', deletedAt: null },
        }),
      );
    });

    it('sends an external offer as raw text for the AI to structure', async () => {
      prisma.user.findUnique.mockResolvedValue(profiledCandidate);
      (axios.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { matchingResult: aiResult } },
      });

      const response = await service.matchOffer(candidate, {
        externalOffer,
        language: 'fr',
      } as any);

      const [url, payload] = (axios.post as jest.Mock).mock.calls[0];
      expect(url).toContain('/api/ai/matching/run');
      expect(payload.language).toBe('fr');
      expect(payload.jobOffer.requiredSkillsRaw).toEqual([]);
      expect(payload.jobOffer.rawText).toContain('Senior Frontend Engineer');
      expect(payload.candidate.skillsRaw).toEqual(['React', 'TypeScript']);
      expect(response).toEqual({
        source: 'external',
        offer: { id: null, title: 'Senior Frontend Engineer', company: 'Acme' },
        result: aiResult,
      });
    });

    it('reports the AI service being down instead of returning an empty result', async () => {
      prisma.user.findUnique.mockResolvedValue(profiledCandidate);
      (axios.post as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        service.matchOffer(candidate, { externalOffer } as any),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
