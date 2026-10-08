import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    register: jest.fn(),
    verifyEmail: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    refreshTokens: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    handleGoogleAuth: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, any> = {
        'app.nodeEnv': 'test',
        'jwt.refreshExpiration': '7d',
        'app.frontendUrl': 'http://localhost:3001',
      };
      return values[key];
    }),
  };

  const mockRes = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    } as unknown as Response);

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(JwtRefreshGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(GoogleAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register delegates to authService.register', async () => {
    authService.register.mockResolvedValue({ message: 'ok' });

    const result = await controller.register({} as any);

    expect(authService.register).toHaveBeenCalled();
    expect(result).toEqual({ message: 'ok' });
  });

  it('login sets refresh cookie and strips it from response body', async () => {
    authService.login.mockResolvedValue({
      user: { id: 'u1' },
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    const res = mockRes();

    const result = await controller.login({} as any, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'r',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result.tokens).toEqual({ accessToken: 'a' });
  });

  it('logout clears the cookie and returns service result', async () => {
    authService.logout.mockResolvedValue({
      message: 'Logged out successfully',
    });
    const res = mockRes();

    const result = await controller.logout({ id: 'u1' } as any, res);

    expect(authService.logout).toHaveBeenCalledWith('u1');
    expect(res.clearCookie).toHaveBeenCalled();
    expect(result.message).toBe('Logged out successfully');
  });

  it('refresh rotates the cookie and returns the new access token', async () => {
    authService.refreshTokens.mockResolvedValue({
      accessToken: 'a2',
      refreshToken: 'r2',
    });
    const res = mockRes();

    const result = await controller.refresh({} as any, res, {
      userId: 'u1',
      refreshToken: 'raw',
    });

    expect(authService.refreshTokens).toHaveBeenCalledWith('u1', 'raw');
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'r2',
      expect.any(Object),
    );
    expect(result).toEqual({ accessToken: 'a2' });
  });

  it('googleAuthCallback redirects to login error page when user missing', async () => {
    const res = mockRes();

    await controller.googleAuthCallback({ user: undefined } as any, res);

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?google=error'),
    );
    expect(authService.handleGoogleAuth).not.toHaveBeenCalled();
  });

  it('googleAuthCallback sets cookie and redirects on success', async () => {
    authService.handleGoogleAuth.mockResolvedValue({
      user: { id: 'u1' },
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    const res = mockRes();

    await controller.googleAuthCallback(
      { user: { googleId: 'g1' } } as any,
      res,
    );

    expect(res.cookie).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/google/callback'),
    );
  });

  it('forgotPassword delegates to authService', async () => {
    authService.forgotPassword.mockResolvedValue({ message: 'ok' });

    const result = await controller.forgotPassword({} as any);

    expect(authService.forgotPassword).toHaveBeenCalled();
    expect(result).toEqual({ message: 'ok' });
  });

  it('resetPassword delegates to authService', async () => {
    authService.resetPassword.mockResolvedValue({ message: 'ok' });

    const result = await controller.resetPassword({} as any);

    expect(authService.resetPassword).toHaveBeenCalled();
    expect(result).toEqual({ message: 'ok' });
  });
});
