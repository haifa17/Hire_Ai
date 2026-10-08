import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { ProfilesService } from './profiles.service';
import { PrismaService } from '../../database/prisma.service';

describe('ProfilesService', () => {
  let service: ProfilesService;

  const txClient = {
    user: { update: jest.fn() },
    candidateProfile: { create: jest.fn(), update: jest.fn() },
    recruiterProfile: { create: jest.fn(), update: jest.fn() },
    company: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  };

  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    candidateProfile: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    recruiterProfile: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    company: { update: jest.fn() },
    resume: { findMany: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(txClient)),
  };

  const candidateUser = {
    id: 'user-1',
    email: 'jane@example.com',
    role: Role.CANDIDATE,
    firstName: 'Jane',
    lastName: 'Doe',
    photoUrl: null,
    phone: null,
    address: null,
  };

  const recruiterUser = {
    ...candidateUser,
    id: 'user-2',
    role: Role.RECRUITER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((cb: any) => cb(txClient));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyCandidateProfile', () => {
    it('returns the profile for a candidate', async () => {
      prisma.user.findUnique.mockResolvedValue(candidateUser);
      prisma.candidateProfile.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        desiredSalary: null,
      });

      const result = await service.getMyCandidateProfile('user-1');

      expect(result.profile.id).toBe('p1');
    });

    it('throws NotFoundException when user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyCandidateProfile('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is not a CANDIDATE', async () => {
      prisma.user.findUnique.mockResolvedValue(recruiterUser);

      await expect(service.getMyCandidateProfile('user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when profile does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(candidateUser);
      prisma.candidateProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMyCandidateProfile('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCandidateProfile', () => {
    it('creates a profile when none exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(candidateUser) // requireUser
        .mockResolvedValueOnce(candidateUser); // updatedUser lookup
      prisma.candidateProfile.findUnique.mockResolvedValue(null);
      txClient.candidateProfile.create.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        desiredSalary: null,
      });

      const result = await service.createCandidateProfile('user-1', {
        professionalSummary: 'summary',
      } as any);

      expect(txClient.candidateProfile.create).toHaveBeenCalled();
      expect(result.profile.id).toBe('p1');
    });

    it('throws ConflictException when profile already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(candidateUser);
      prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createCandidateProfile('user-1', {} as any),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the requested email is taken', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(candidateUser)
        .mockResolvedValueOnce({ id: 'other-user' });

      await expect(
        service.createCandidateProfile('user-1', {
          email: 'taken@example.com',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCandidateProfile', () => {
    it('deletes the existing profile', async () => {
      prisma.user.findUnique.mockResolvedValue(candidateUser);
      prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'p1' });

      const result = await service.deleteCandidateProfile('user-1');

      expect(prisma.candidateProfile.delete).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result.message).toContain('deleted successfully');
    });

    it('throws NotFoundException when no profile exists', async () => {
      prisma.user.findUnique.mockResolvedValue(candidateUser);
      prisma.candidateProfile.findUnique.mockResolvedValue(null);

      await expect(service.deleteCandidateProfile('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCandidateProfileByUserId', () => {
    it('returns user, profile, and resumes', async () => {
      prisma.user.findUnique.mockResolvedValue(candidateUser);
      prisma.candidateProfile.findUnique.mockResolvedValue(null);
      prisma.resume.findMany.mockResolvedValue([]);

      const result = await service.getCandidateProfileByUserId('user-1');

      expect(result.profile).toBeNull();
      expect(result.resumes).toEqual([]);
    });

    it('throws NotFoundException when the candidate user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getCandidateProfileByUserId('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRecruiterCompany', () => {
    it('throws ForbiddenException when trying to switch companies', async () => {
      prisma.user.findUnique.mockResolvedValue(recruiterUser);
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        userId: 'user-2',
        companyId: 'company-1',
      });

      await expect(
        service.updateRecruiterCompany('user-2', {
          companyId: 'company-2',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the recruiter has no profile', async () => {
      prisma.user.findUnique.mockResolvedValue(recruiterUser);
      prisma.recruiterProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRecruiterCompany('user-2', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRecruiterProfile', () => {
    it('deletes the recruiter profile', async () => {
      prisma.user.findUnique.mockResolvedValue(recruiterUser);
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        userId: 'user-2',
      });

      const result = await service.deleteRecruiterProfile('user-2');

      expect(prisma.recruiterProfile.delete).toHaveBeenCalled();
      expect(result.message).toContain('deleted successfully');
    });
  });
});
