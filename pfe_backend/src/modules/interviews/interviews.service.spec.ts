import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InterviewStatus, InterviewType, Role } from '@prisma/client';

import { InterviewsService } from './interviews.service';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../common/mail/mail.service';

describe('InterviewsService', () => {
  let service: InterviewsService;

  const prisma = {
    user: { findFirst: jest.fn() },
    jobOffer: { findUnique: jest.fn() },
    application: { findUnique: jest.fn() },
    interview: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const mailService = { sendInterviewInvitation: jest.fn() };

  const recruiter: any = { id: 'recruiter-1', role: Role.RECRUITER };
  const candidateUser: any = { id: 'candidate-1', role: Role.CANDIDATE };

  const futureDate = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  beforeEach(async () => {
    jest.clearAllMocks();
    mailService.sendInterviewInvitation.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws ForbiddenException for candidates', async () => {
      await expect(
        service.create(candidateUser, {
          scheduledAt: futureDate,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when scheduled time is not in the future', async () => {
      await expect(
        service.create(recruiter, {
          scheduledAt: new Date(Date.now() - 1000).toISOString(),
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when candidate is missing', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.jobOffer.findUnique.mockResolvedValue({ id: 'job-1' });

      await expect(
        service.create(recruiter, {
          scheduledAt: futureDate,
          candidateId: 'candidate-1',
          jobOfferId: 'job-1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when candidate has not applied', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'candidate-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      });
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'recruiter-1',
        title: 'Engineer',
        city: 'NYC',
        country: 'US',
      });
      prisma.application.findUnique.mockResolvedValue(null);

      await expect(
        service.create(recruiter, {
          scheduledAt: futureDate,
          candidateId: 'candidate-1',
          jobOfferId: 'job-1',
          duration: 30,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates an interview and sends the invitation', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'candidate-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      });
      prisma.jobOffer.findUnique.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'recruiter-1',
        title: 'Engineer',
        city: 'NYC',
        country: 'US',
      });
      prisma.application.findUnique.mockResolvedValue({ id: 'app-1' });
      prisma.interview.findMany.mockResolvedValue([]);
      prisma.interview.create.mockResolvedValue({
        id: 'interview-1',
        title: 'Tech round',
        interviewType: InterviewType.VIDEO,
        scheduledAt: new Date(futureDate),
        duration: 30,
        message: null,
        sendInvitation: true,
        recruiter: {
          id: 'recruiter-1',
          firstName: 'Bob',
          lastName: 'Recruiter',
        },
      });

      const result = await service.create(recruiter, {
        scheduledAt: futureDate,
        candidateId: 'candidate-1',
        jobOfferId: 'job-1',
        duration: 30,
        title: 'Tech round',
        interviewType: InterviewType.VIDEO,
      } as any);

      expect(prisma.interview.create).toHaveBeenCalled();
      expect(mailService.sendInterviewInvitation).toHaveBeenCalled();
      expect(result.id).toBe('interview-1');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.findOne(recruiter, 'i1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for unrelated users', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 'i1',
        recruiterId: 'other-recruiter',
        candidateId: 'other-candidate',
      });

      await expect(service.findOne(recruiter, 'i1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows the owning recruiter', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 'i1',
        recruiterId: 'recruiter-1',
        candidateId: 'candidate-1',
      });

      const result = await service.findOne(recruiter, 'i1');
      expect(result.id).toBe('i1');
    });
  });

  describe('remove', () => {
    it('deletes the interview for the owning recruiter', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 'i1',
        recruiterId: 'recruiter-1',
      });
      prisma.interview.delete.mockResolvedValue({});

      const result = await service.remove(recruiter, 'i1');

      expect(prisma.interview.delete).toHaveBeenCalledWith({
        where: { id: 'i1' },
      });
      expect(result.message).toContain('deleted successfully');
    });

    it('throws ForbiddenException for a non-owning recruiter', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 'i1',
        recruiterId: 'other-recruiter',
      });

      await expect(service.remove(recruiter, 'i1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getRecruiterAvailability', () => {
    it('throws ForbiddenException when a recruiter checks someone else', async () => {
      await expect(
        service.getRecruiterAvailability(recruiter, 'someone-else', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when "to" is before "from"', async () => {
      await expect(
        service.getRecruiterAvailability(recruiter, 'recruiter-1', {
          from: '2026-01-10',
          to: '2026-01-01',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns busy slots for the recruiter', async () => {
      prisma.interview.findMany.mockResolvedValue([
        {
          id: 'i1',
          title: 'Round 1',
          scheduledAt: new Date('2026-01-05T10:00:00Z'),
          duration: 30,
          status: InterviewStatus.SCHEDULED,
        },
      ]);

      const result = await service.getRecruiterAvailability(
        recruiter,
        'recruiter-1',
        {} as any,
      );

      expect(result.busySlots).toHaveLength(1);
    });
  });
});
