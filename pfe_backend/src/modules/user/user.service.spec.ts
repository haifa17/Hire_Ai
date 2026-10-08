import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { UserService } from './user.service';
import { UserRepositoryImpl } from './repositories/user.repository';

describe('UserService', () => {
  let service: UserService;
  const userRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    update: jest.fn(),
    listUsers: jest.fn(),
    findDetailsById: jest.fn(),
  };

  const baseUser = {
    id: 'user-1',
    email: 'jane@example.com',
    role: 'CANDIDATE',
    isEmailVerified: true,
    isActive: true,
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    address: null,
    photoUrl: null,
    password: 'secret',
    refreshToken: null,
    passwordResetToken: null,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    passwordResetExpires: null,
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepositoryImpl, useValue: userRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      const result = await service.findById('user-1');
      expect(result).toEqual(baseUser);
    });

    it('throws NotFoundException when not found', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSelf', () => {
    it('updates fields and returns sanitized user', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.update.mockResolvedValue({
        ...baseUser,
        firstName: 'Janet',
      });

      const result = await service.updateSelf('user-1', {
        firstName: 'Janet',
      } as any);

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ firstName: 'Janet' }),
      );
      expect(result.firstName).toBe('Janet');
      expect((result as any).password).toBeUndefined();
    });

    it('throws ConflictException when new email already used by another user', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.findByEmail.mockResolvedValue({
        ...baseUser,
        id: 'other-user',
      });

      await expect(
        service.updateSelf('user-1', { email: 'taken@example.com' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listUsersForAdmin', () => {
    it('returns paginated sanitized users', async () => {
      userRepository.listUsers.mockResolvedValue({
        items: [baseUser],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await service.listUsersForAdmin({} as any);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getUserDetailsForAdmin', () => {
    it('throws NotFoundException when user missing', async () => {
      userRepository.findDetailsById.mockResolvedValue(null);
      await expect(service.getUserDetailsForAdmin('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns sanitized user with profiles', async () => {
      userRepository.findDetailsById.mockResolvedValue({
        ...baseUser,
        candidateProfile: { id: 'cp-1' },
        recruiterProfile: null,
      });

      const result = await service.getUserDetailsForAdmin('user-1');
      expect(result.candidateProfile).toEqual({ id: 'cp-1' });
    });
  });

  describe('setUserSuspensionByAdmin', () => {
    it('throws ForbiddenException when acting on self', async () => {
      await expect(
        service.setUserSuspensionByAdmin('user-1', 'user-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns early message when already in the requested state', async () => {
      userRepository.findById.mockResolvedValue(baseUser);

      const result = await service.setUserSuspensionByAdmin(
        'admin-1',
        'user-1',
        true,
      );

      expect(userRepository.update).not.toHaveBeenCalled();
      expect(result.message).toContain('already active');
    });

    it('suspends the target user and invalidates refresh token', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.update.mockResolvedValue({
        ...baseUser,
        isActive: false,
      });

      const result = await service.setUserSuspensionByAdmin(
        'admin-1',
        'user-1',
        false,
      );

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ isActive: false, refreshToken: null }),
      );
      expect(result.message).toContain('suspended successfully');
    });
  });

  describe('verifyUserEmailByAdmin', () => {
    it('returns early when already verified', async () => {
      userRepository.findById.mockResolvedValue(baseUser);

      const result = await service.verifyUserEmailByAdmin('user-1');

      expect(userRepository.update).not.toHaveBeenCalled();
      expect(result.message).toContain('already verified');
    });

    it('verifies email when not yet verified', async () => {
      userRepository.findById.mockResolvedValue({
        ...baseUser,
        isEmailVerified: false,
      });
      userRepository.update.mockResolvedValue({
        ...baseUser,
        isEmailVerified: true,
      });

      const result = await service.verifyUserEmailByAdmin('user-1');

      expect(userRepository.update).toHaveBeenCalled();
      expect(result.message).toContain('verified successfully');
    });
  });

  describe('sanitize', () => {
    it('strips sensitive fields', () => {
      const result = service.sanitize(baseUser);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('googleId');
    });
  });
});
