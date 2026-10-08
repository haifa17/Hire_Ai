import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UserService } from '../../user/user.service';
import { UserRepositoryImpl } from '../../user/repositories/user.repository';
import { MailService } from '../../common/mail/mail.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  const userService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByGoogleId: jest.fn(),
  };
  const userRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findByEmailVerificationToken: jest.fn(),
    findByPasswordResetToken: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, any> = {
        'throttle.emailVerificationExpirationHours': 24,
        'throttle.passwordResetExpirationMinutes': 30,
        'jwt.accessSecret': 'access-secret',
        'jwt.refreshSecret': 'refresh-secret',
        'jwt.accessExpiration': '15m',
        'jwt.refreshExpiration': '7d',
      };
      return values[key];
    }),
  };
  const mailService = {
    sendEmailVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  const baseUser = {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hashed-password',
    role: Role.CANDIDATE,
    isEmailVerified: true,
    isActive: true,
    googleId: null,
    photoUrl: null,
    refreshToken: 'hashed-refresh',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: UserRepositoryImpl, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('creates a user and sends verification email', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(baseUser);

      const result = await service.register({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'Password1!',
        role: Role.CANDIDATE,
      } as any);

      expect(userRepository.create).toHaveBeenCalled();
      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        'jane@example.com',
        expect.any(String),
      );
      expect(result.message).toContain('Registration successful');
    });

    it('throws ConflictException when email already registered', async () => {
      userService.findByEmail.mockResolvedValue(baseUser);

      await expect(
        service.register({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          password: 'Password1!',
          role: Role.CANDIDATE,
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns user and tokens on valid credentials', async () => {
      userService.findByEmail.mockResolvedValue(baseUser);
      userRepository.update.mockResolvedValue(baseUser);

      const result = await service.login({
        email: 'jane@example.com',
        password: 'Password1!',
      });

      expect(result.tokens.accessToken).toBe('signed-token');
      expect(result.user.email).toBe('jane@example.com');
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when account is suspended', async () => {
      userService.findByEmail.mockResolvedValue({
        ...baseUser,
        isActive: false,
      });

      await expect(
        service.login({ email: baseUser.email, password: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException on password mismatch', async () => {
      userService.findByEmail.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: baseUser.email, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when email is not verified', async () => {
      userService.findByEmail.mockResolvedValue({
        ...baseUser,
        isEmailVerified: false,
      });

      await expect(
        service.login({ email: baseUser.email, password: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyEmail', () => {
    it('marks email verified for a valid token', async () => {
      userRepository.findByEmailVerificationToken.mockResolvedValue({
        ...baseUser,
        emailVerificationExpires: new Date(Date.now() + 100000),
      });

      const result = await service.verifyEmail('token');

      expect(userRepository.update).toHaveBeenCalledWith(
        baseUser.id,
        expect.objectContaining({ isEmailVerified: true }),
      );
      expect(result.message).toContain('verified');
    });

    it('throws BadRequestException for invalid token', async () => {
      userRepository.findByEmailVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail('bad')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for expired token', async () => {
      userRepository.findByEmailVerificationToken.mockResolvedValue({
        ...baseUser,
        emailVerificationExpires: new Date(Date.now() - 100000),
      });

      await expect(service.verifyEmail('expired')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('clears the refresh token', async () => {
      userRepository.update.mockResolvedValue(baseUser);

      const result = await service.logout('user-1');

      expect(userRepository.update).toHaveBeenCalledWith('user-1', {
        refreshToken: null,
      });
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('changePassword', () => {
    it('updates the password when current password matches', async () => {
      userService.findById.mockResolvedValue(baseUser);

      const result = await service.changePassword('user-1', {
        currentPassword: 'old',
        newPassword: 'new',
      } as any);

      expect(userRepository.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ password: 'hashed-value' }),
      );
      expect(result.message).toContain('changed successfully');
    });

    it('throws UnauthorizedException when user not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', {
          currentPassword: 'old',
          newPassword: 'new',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when current password is wrong', async () => {
      userService.findById.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'new',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('rotates tokens for a valid refresh token', async () => {
      userService.findById.mockResolvedValue(baseUser);

      const result = await service.refreshTokens('user-1', 'raw-token');

      expect(result.accessToken).toBe('signed-token');
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('throws UnauthorizedException and clears token when inactive', async () => {
      userService.findById.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(
        service.refreshTokens('user-1', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(userRepository.update).toHaveBeenCalledWith('user-1', {
        refreshToken: null,
      });
    });

    it('throws UnauthorizedException on token mismatch (reuse detection)', async () => {
      userService.findById.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-1', 'bad-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('sends reset email when user exists', async () => {
      userService.findByEmail.mockResolvedValue(baseUser);

      const result = await service.forgotPassword({
        email: baseUser.email,
      } as any);

      expect(mailService.sendPasswordReset).toHaveBeenCalled();
      expect(result.message).toContain('If that email is registered');
    });

    it('returns generic message when user does not exist (no enumeration)', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nobody@example.com',
      } as any);

      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
      expect(result.message).toContain('If that email is registered');
    });
  });

  describe('resetPassword', () => {
    it('resets password for a valid token', async () => {
      userRepository.findByPasswordResetToken.mockResolvedValue({
        ...baseUser,
        passwordResetExpires: new Date(Date.now() + 100000),
      });

      const result = await service.resetPassword({
        token: 'token',
        newPassword: 'NewPass1!',
      } as any);

      expect(userRepository.update).toHaveBeenCalledWith(
        baseUser.id,
        expect.objectContaining({ password: 'hashed-value' }),
      );
      expect(result.message).toContain('reset successfully');
    });

    it('throws BadRequestException for invalid token', async () => {
      userRepository.findByPasswordResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad', newPassword: 'x' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      userRepository.findByPasswordResetToken.mockResolvedValue({
        ...baseUser,
        passwordResetExpires: new Date(Date.now() - 100000),
      });

      await expect(
        service.resetPassword({ token: 'expired', newPassword: 'x' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleGoogleAuth', () => {
    it('creates a new user when none exists', async () => {
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(baseUser);

      const result = await service.handleGoogleAuth({
        googleId: 'g-1',
        email: baseUser.email,
        firstName: 'Jane',
        lastName: 'Doe',
        photoUrl: null,
      } as any);

      expect(userRepository.create).toHaveBeenCalled();
      expect(result.tokens.accessToken).toBe('signed-token');
    });

    it('throws ForbiddenException when the existing account is suspended', async () => {
      userService.findByGoogleId.mockResolvedValue({
        ...baseUser,
        isActive: false,
      });
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.handleGoogleAuth({
          googleId: 'g-1',
          email: baseUser.email,
          firstName: 'Jane',
          lastName: 'Doe',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates and reuses an existing user found by email', async () => {
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue({
        ...baseUser,
        googleId: null,
        isEmailVerified: false,
      });
      userRepository.update.mockResolvedValue(baseUser);

      const result = await service.handleGoogleAuth({
        googleId: 'g-1',
        email: baseUser.email,
        firstName: 'Jane',
        lastName: 'Doe',
        photoUrl: 'http://photo',
      } as any);

      expect(userRepository.update).toHaveBeenCalled();
      expect(result.user.email).toBe(baseUser.email);
    });
  });
});
