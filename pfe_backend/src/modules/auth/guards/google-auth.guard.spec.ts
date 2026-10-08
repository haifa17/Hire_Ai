import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleOAuthStateService } from '../services/google-oauth-state.service';

describe('GoogleAuthGuard', () => {
  let guard: GoogleAuthGuard;
  let configService: { get: jest.Mock };
  let googleOAuthStateService: { createState: jest.Mock };
  let superCanActivate: jest.SpyInstance;

  const configValues: Record<string, string | undefined> = {
    'google.clientId': 'client-id',
    'google.clientSecret': 'client-secret',
    'google.callbackUrl': 'http://localhost:3000/api/v1/auth/google/callback',
    'app.frontendUrl': 'http://localhost:3001',
  };

  const makeContext = (path: string, response: any = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ path, query: {} }),
        getResponse: () => response,
      }),
    } as any);

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => configValues[key]),
    };
    googleOAuthStateService = {
      createState: jest.fn().mockReturnValue('state-token'),
    };

    guard = new GoogleAuthGuard(
      configService as unknown as ConfigService,
      googleOAuthStateService as unknown as GoogleOAuthStateService,
    );

    const parentPrototype = Object.getPrototypeOf(GoogleAuthGuard.prototype);
    superCanActivate = jest.spyOn(parentPrototype, 'canActivate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(guard).toBeDefined();
  });

  it('delegates to passport when Google OAuth credentials are configured', () => {
    superCanActivate.mockReturnValue(true);

    const result = guard.canActivate(makeContext('/api/v1/auth/google'));

    expect(superCanActivate).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('throws ServiceUnavailableException when credentials are missing and not on the callback route', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => guard.canActivate(makeContext('/api/v1/auth/google'))).toThrow(
      ServiceUnavailableException,
    );
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('redirects to the frontend and denies access when credentials are missing on the callback route', () => {
    configService.get.mockImplementation((key: string) =>
      key === 'app.frontendUrl' ? configValues['app.frontendUrl'] : undefined,
    );
    const redirect = jest.fn();

    const result = guard.canActivate(
      makeContext('/api/v1/auth/google/callback', { redirect }),
    );

    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?google=unavailable'),
    );
    expect(result).toBe(false);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  describe('getAuthenticateOptions', () => {
    it('creates OAuth state for the initial authorize request', () => {
      const context = makeContext('/api/v1/auth/google');

      const options: any = guard.getAuthenticateOptions(context);

      expect(googleOAuthStateService.createState).toHaveBeenCalled();
      expect(options.state).toBe('state-token');
      expect(options.scope).toEqual(['email', 'profile']);
    });

    it('does not create OAuth state for the callback request', () => {
      const context = makeContext('/api/v1/auth/google/callback');

      const options: any = guard.getAuthenticateOptions(context);

      expect(googleOAuthStateService.createState).not.toHaveBeenCalled();
      expect(options.state).toBeUndefined();
    });
  });

  describe('handleRequest', () => {
    it('returns the user when authentication succeeds', () => {
      const context = makeContext('/api/v1/auth/google/callback');
      const user = { id: 'u1' };

      const result = guard.handleRequest(null, user, null, context);

      expect(result).toBe(user);
    });

    it('returns null on the callback route when authentication fails', () => {
      const context = makeContext('/api/v1/auth/google/callback');

      const result = guard.handleRequest(
        new Error('failed'),
        null,
        null,
        context,
      );

      expect(result).toBeNull();
    });

    it('throws when authentication fails outside the callback route', () => {
      const context = makeContext('/api/v1/auth/google');

      expect(() =>
        guard.handleRequest(new Error('failed'), null, null, context),
      ).toThrow('failed');
    });

    it('throws UnauthorizedException-like error when there is no error but also no user', () => {
      const context = makeContext('/api/v1/auth/google');

      expect(() => guard.handleRequest(null, null, null, context)).toThrow(
        'Google authentication failed',
      );
    });
  });
});
