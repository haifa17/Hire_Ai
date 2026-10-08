import {
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';

import { UserService } from '../../user/user.service';
import { UserRepositoryImpl } from '../../user/repositories/user.repository';
import { MailService } from '../../common/mail/mail.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import {
  AuthResponse,
  AuthTokens,
  GoogleOAuthProfile,
  JwtPayload,
} from '../interfaces/auth.interface';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepositoryImpl,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(
      Date.now() +
        this.configService.get<number>(
          'throttle.emailVerificationExpirationHours',
        ) *
          3_600_000,
    );

    await this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashed,
      role: dto.role,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    await this.mailService.sendEmailVerification(dto.email, verificationToken);

    this.logger.log(`New user registered: ${dto.email}`);
    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFY EMAIL
  // ─────────────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prismaFindByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    if (user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.userRepository.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ─────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('This account has been suspended');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    };
  }

  async handleGoogleAuth(profile: GoogleOAuthProfile): Promise<AuthResponse> {
    const existingByGoogleId = await this.userService.findByGoogleId(
      profile.googleId,
    );
    const existingByEmail = await this.userService.findByEmail(profile.email);
    const existing = existingByGoogleId ?? existingByEmail;

    if (existing?.isActive === false) {
      throw new ForbiddenException('This account has been suspended');
    }

    const user = existing
      ? await this.syncGoogleUser(existing, existingByGoogleId, profile)
      : await this.createGoogleUser(profile);

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Google authentication completed: ${user.email}`);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    };
  }

  private async syncGoogleUser(
    existing: User,
    existingByGoogleId: User | null,
    profile: GoogleOAuthProfile,
  ): Promise<User> {
    const updates: Partial<{
      googleId: string;
      isEmailVerified: boolean;
      photoUrl: string | null;
      firstName: string;
      lastName: string;
    }> = {};

    if (!existing.googleId) {
      updates.googleId = profile.googleId;
    }

    if (!existing.isEmailVerified) {
      updates.isEmailVerified = true;
    }

    if (!existing.photoUrl && profile.photoUrl) {
      updates.photoUrl = profile.photoUrl;
    }

    if (existingByGoogleId && existingByGoogleId.id === existing.id) {
      updates.firstName = profile.firstName;
      updates.lastName = profile.lastName;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    return this.userRepository.update(existing.id, updates);
  }

  private async createGoogleUser(profile: GoogleOAuthProfile): Promise<User> {
    const requestedRole = this.normalizeRole(profile.role);
    const hashedPassword = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      SALT_ROUNDS,
    );

    try {
      return await this.userRepository.create({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        password: hashedPassword,
        googleId: profile.googleId,
        role: requestedRole,
        isEmailVerified: true,
        photoUrl: profile.photoUrl ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Google account creation failed for ${profile.email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Unable to complete Google sign-in',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<{ message: string }> {
    await this.userRepository.update(userId, { refreshToken: null });
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  // ─────────────────────────────────────────────────────────────
  // CHANGE PASSWORD
  // ─────────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    // Update password and invalidate all sessions
    await this.userRepository.update(userId, {
      password: hashed,
      refreshToken: null,
    });

    this.logger.log(`Password changed for user: ${user.email}`);
    return { message: 'Password has been changed successfully' };
  }

  // ─────────────────────────────────────────────────────────────
  // REFRESH TOKEN ROTATION
  // ─────────────────────────────────────────────────────────────

  async refreshTokens(
    userId: string,
    rawRefreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.userService.findById(userId);

    if (!user.isActive) {
      await this.userRepository.update(userId, { refreshToken: null });
      throw new UnauthorizedException('Access denied');
    }

    if (!user?.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const tokenMatch = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!tokenMatch) {
      // Possible token reuse — invalidate stored token (security measure)
      await this.userRepository.update(userId, { refreshToken: null });
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please log in again.',
      );
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Tokens rotated for user: ${user.email}`);
    return tokens;
  }

  // ─────────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(dto.email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(
        Date.now() +
          this.configService.get<number>(
            'throttle.passwordResetExpirationMinutes',
          ) *
            60_000,
      );

      await this.userRepository.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      await this.mailService.sendPasswordReset(dto.email, resetToken);
      this.logger.log(`Password reset requested for: ${dto.email}`);
    }

    // Keep a generic response to prevent email enumeration.
    return {
      message:
        'If that email is registered you will receive a password reset link shortly.',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.prismaFindByResetToken(dto.token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Password reset token has expired');
    }

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.userRepository.update(user.id, {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpires: null,
      refreshToken: null, // Invalidate all sessions
    });

    this.logger.log(`Password reset completed for: ${user.email}`);
    return { message: 'Password has been reset successfully. Please log in.' };
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.accessExpiration',
        ) as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiration',
        ) as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    rawToken: string,
  ): Promise<void> {
    const hashed = await bcrypt.hash(rawToken, SALT_ROUNDS);
    await this.userRepository.update(userId, { refreshToken: hashed });
  }

  private normalizeRole(role?: Role): Role {
    return role === Role.RECRUITER ? Role.RECRUITER : Role.CANDIDATE;
  }

  /** Direct Prisma look-up by email verification token */
  private async prismaFindByVerificationToken(
    token: string,
  ): Promise<User | null> {
    return this.userRepository.findByEmailVerificationToken(token);
  }

  /** Direct Prisma look-up by password reset token */
  private async prismaFindByResetToken(token: string): Promise<User | null> {
    return this.userRepository.findByPasswordResetToken(token);
  }
}
