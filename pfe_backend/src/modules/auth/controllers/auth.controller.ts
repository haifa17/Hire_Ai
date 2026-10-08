import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { User } from '@prisma/client';
import { Request, Response, CookieOptions } from 'express';
import { GoogleOAuthRequest } from '../interfaces/auth.interface';

const REFRESH_COOKIE_NAME = 'refresh_token';
const DEFAULT_REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private parseDurationToMs(duration: string | undefined): number {
    if (!duration) return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;

    const regex = /^(\d+)([smhd])$/i;
    const match = regex.exec(duration.trim());
    if (!match) return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;

    const value = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    return value * 24 * 60 * 60 * 1000;
  }

  private refreshCookieOptions(): CookieOptions {
    const isProd =
      (this.configService.get<string>('app.nodeEnv') ?? 'development') ===
      'production';
    const refreshExpiration = this.configService.get<string>(
      'jwt.refreshExpiration',
    );

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: this.parseDurationToMs(refreshExpiration),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // GET /auth/google
  // ─────────────────────────────────────────────────────────────

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Start Google OAuth authentication' })
  googleAuth() {
    return undefined;
  }

  // ─────────────────────────────────────────────────────────────
  // GET /auth/google/callback
  // ─────────────────────────────────────────────────────────────

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Complete Google OAuth authentication' })
  async googleAuthCallback(
    @Req() req: GoogleOAuthRequest,
    @Res() res: Response,
  ) {
    if (!req.user) {
      const frontendUrl = this.configService.get<string>('app.frontendUrl');
      res.redirect(new URL('/login?google=error', frontendUrl).toString());
      return;
    }

    const auth = await this.authService.handleGoogleAuth(req.user);
    res.cookie(
      REFRESH_COOKIE_NAME,
      auth.tokens.refreshToken,
      this.refreshCookieOptions(),
    );

    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    res.redirect(new URL('/auth/google/callback', frontendUrl).toString());
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/register
  // ─────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/verify-email
  // ─────────────────────────────────────────────────────────────

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const auth = await this.authService.login(dto);
    res.cookie(
      REFRESH_COOKIE_NAME,
      auth.tokens.refreshToken,
      this.refreshCookieOptions(),
    );

    return {
      user: auth.user,
      tokens: {
        accessToken: auth.tokens.accessToken,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...this.refreshCookieOptions(),
      maxAge: undefined,
    });
    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/change-password
  // ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────────────────────────────

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access & refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() _req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: { userId: string; refreshToken: string },
  ) {
    const tokens = await this.authService.refreshTokens(
      user.userId,
      user.refreshToken,
    );

    res.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      this.refreshCookieOptions(),
    );

    return {
      accessToken: tokens.accessToken,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/forgot-password
  // ─────────────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent (if registered)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // POST /auth/reset-password
  // ─────────────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
