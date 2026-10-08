import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReportStatus } from '@prisma/client';

import { JobReportsService } from './job-reports.service';
import { PrismaService } from '../../database/prisma.service';

describe('JobReportsService', () => {
  let service: JobReportsService;

  const txClient = {
    jobReport: { updateMany: jest.fn() },
    jobOffer: { update: jest.fn() },
  };

  const prisma = {
    jobOffer: { findFirst: jest.fn(), findUnique: jest.fn() },
    jobReport: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(txClient)),
  };

  const user: any = { id: 'user-1' };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((cb: any) => cb(txClient));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<JobReportsService>(JobReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('throws NotFoundException when job offer does not exist', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue(null);

      await expect(
        service.createReport(user, { jobOfferId: 'job-1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when reporting own job offer', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'user-1',
      });

      await expect(
        service.createReport(user, { jobOfferId: 'job-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when already reported', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'other-user',
      });
      prisma.jobReport.findUnique.mockResolvedValue({ id: 'report-1' });

      await expect(
        service.createReport(user, { jobOfferId: 'job-1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the report', async () => {
      prisma.jobOffer.findFirst.mockResolvedValue({
        id: 'job-1',
        recruiterId: 'other-user',
      });
      prisma.jobReport.findUnique.mockResolvedValue(null);
      prisma.jobReport.create.mockResolvedValue({ id: 'report-1' });

      const result = await service.createReport(user, {
        jobOfferId: 'job-1',
        type: 'SPAM',
        reason: 'spam job',
      } as any);

      expect(prisma.jobReport.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'report-1' });
    });
  });

  describe('checkUserReport', () => {
    it('returns hasReported true when a report exists', async () => {
      prisma.jobReport.findUnique.mockResolvedValue({ id: 'report-1' });

      const result = await service.checkUserReport('user-1', 'job-1');
      expect(result).toEqual({ hasReported: true });
    });

    it('returns hasReported false when no report exists', async () => {
      prisma.jobReport.findUnique.mockResolvedValue(null);

      const result = await service.checkUserReport('user-1', 'job-1');
      expect(result).toEqual({ hasReported: false });
    });
  });

  describe('resolveReport', () => {
    it('throws NotFoundException when report is missing', async () => {
      prisma.jobReport.findUnique.mockResolvedValue(null);

      await expect(service.resolveReport('report-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('resolves an existing report', async () => {
      prisma.jobReport.findUnique.mockResolvedValue({ id: 'report-1' });
      prisma.jobReport.update.mockResolvedValue({
        id: 'report-1',
        status: ReportStatus.RESOLVED,
      });

      const result = await service.resolveReport('report-1');
      expect(result.status).toBe(ReportStatus.RESOLVED);
    });
  });

  describe('deleteJobFromReport', () => {
    it('throws NotFoundException when job offer is missing', async () => {
      prisma.jobOffer.findUnique.mockResolvedValue(null);

      await expect(service.deleteJobFromReport('job-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('resolves reports and closes the job offer', async () => {
      prisma.jobOffer.findUnique.mockResolvedValue({ id: 'job-1' });
      txClient.jobReport.updateMany.mockResolvedValue({ count: 2 });
      txClient.jobOffer.update.mockResolvedValue({});

      const result = await service.deleteJobFromReport('job-1');

      expect(txClient.jobReport.updateMany).toHaveBeenCalled();
      expect(txClient.jobOffer.update).toHaveBeenCalled();
      expect(result.jobOfferId).toBe('job-1');
    });
  });
});
