import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigService } from '@nestjs/config';

import { AuthController } from '../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../src/modules/auth/guards/jwt-refresh.guard';
import { GoogleAuthGuard } from '../src/modules/auth/guards/google-auth.guard';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  let jwtAuthGuardSpy: jest.SpyInstance;
  let jwtRefreshGuardSpy: jest.SpyInstance;

  beforeEach(async () => {
    jwtAuthGuardSpy = jest
      .spyOn(JwtAuthGuard.prototype, 'canActivate')
      .mockImplementation((context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = { id: 'user-1' };
        return true;
      });

    jwtRefreshGuardSpy = jest
      .spyOn(JwtRefreshGuard.prototype, 'canActivate')
      .mockImplementation((context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = { userId: 'user-1', refreshToken: 'raw-refresh-token' };
        return true;
      });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'app.nodeEnv') return 'test';
              if (key === 'jwt.refreshExpiration') return '7d';
              return undefined;
            },
          },
        },
        JwtAuthGuard,
        JwtRefreshGuard,
      ],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jwtAuthGuardSpy.mockRestore();
    jwtRefreshGuardSpy.mockRestore();
    await app.close();
  });

  it('POST /auth/login sets refresh token cookie and returns access token only', async () => {
    authService.login.mockResolvedValue({
      user: {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        role: 'CANDIDATE',
        isEmailVerified: true,
      },
      tokens: {
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      },
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'jane@example.com', password: 'fixture' })
      .expect(200);

    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(res.body.tokens.accessToken).toBe('access-1');
    expect(res.body.tokens.refreshToken).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refresh_token=refresh-1');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('Path=/api/v1/auth/refresh');
  });

  it('POST /auth/refresh rotates cookie and returns a new access token', async () => {
    authService.refreshTokens.mockResolvedValue({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .expect(200);

    expect(authService.refreshTokens).toHaveBeenCalledWith(
      'user-1',
      'raw-refresh-token',
    );
    expect(res.body.accessToken).toBe('access-2');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refresh_token=refresh-2');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('POST /auth/logout clears refresh token cookie', async () => {
    authService.logout.mockResolvedValue({
      message: 'Logged out successfully',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(200);

    expect(authService.logout).toHaveBeenCalledWith('user-1');
    expect(res.body.message).toBe('Logged out successfully');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refresh_token=;');
  });
});
