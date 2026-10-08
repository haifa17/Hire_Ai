import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { JobOfferOwnershipGuard } from './job-offer-ownership.guard';
import { PrismaService } from '../../../database/prisma.service';

describe('JobOfferOwnershipGuard', () => {
  let guard: JobOfferOwnershipGuard;
  const prisma = { jobOffer: { findFirst: jest.fn() } };

  const makeContext = (user: any, params: any = { id: 'job-1' }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as any);

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOfferOwnershipGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<JobOfferOwnershipGuard>(JobOfferOwnershipGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows access when there is no job offer id in params', async () => {
    const result = await guard.canActivate(
      makeContext({ id: 'user-1', role: Role.RECRUITER }, {}),
    );
    expect(result).toBe(true);
  });

  it('allows admins unconditionally', async () => {
    const result = await guard.canActivate(
      makeContext({ id: 'admin-1', role: Role.ADMIN }),
    );
    expect(result).toBe(true);
  });

  it('throws ForbiddenException for non-recruiter, non-admin users', async () => {
    await expect(
      guard.canActivate(makeContext({ id: 'user-1', role: Role.CANDIDATE })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when the job offer does not exist', async () => {
    prisma.jobOffer.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        makeContext({ id: 'recruiter-1', role: Role.RECRUITER }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the recruiter does not own the job offer', async () => {
    prisma.jobOffer.findFirst.mockResolvedValue({
      id: 'job-1',
      recruiterId: 'someone-else',
    });

    await expect(
      guard.canActivate(
        makeContext({ id: 'recruiter-1', role: Role.RECRUITER }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows the owning recruiter', async () => {
    prisma.jobOffer.findFirst.mockResolvedValue({
      id: 'job-1',
      recruiterId: 'recruiter-1',
    });

    const result = await guard.canActivate(
      makeContext({ id: 'recruiter-1', role: Role.RECRUITER }),
    );
    expect(result).toBe(true);
  });
});
