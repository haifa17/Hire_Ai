import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GoogleOAuthStateService } from './google-oauth-state.service';

describe('GoogleOAuthStateService', () => {
  let service: GoogleOAuthStateService;
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, any> = {
        'google.stateSecret': 'test-secret',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, any> = {
        'google.stateSecret': 'test-secret',
      };
      return values[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthStateService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<GoogleOAuthStateService>(GoogleOAuthStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates and parses a valid state round-trip', () => {
    const state = service.createState('signup', 'RECRUITER');
    const payload = service.parseState(state);

    expect(payload.flow).toBe('signup');
    expect(payload.role).toBe('RECRUITER');
  });

  it('defaults flow to signin and role to CANDIDATE', () => {
    const state = service.createState();
    const payload = service.parseState(state);

    expect(payload.flow).toBe('signin');
    expect(payload.role).toBe('CANDIDATE');
  });

  it('throws UnauthorizedException when state is missing', () => {
    expect(() => service.parseState(undefined)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when state is malformed', () => {
    expect(() => service.parseState('not-a-valid-state')).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when signature is tampered', () => {
    const state = service.createState('signin', 'CANDIDATE');
    const [payload] = state.split('.');
    const tampered = `${payload}.deadbeef`;

    expect(() => service.parseState(tampered)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when state has expired', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000_000);
    const state = service.createState('signin', 'CANDIDATE');
    nowSpy.mockReturnValue(1_000_000 + 11 * 60 * 1000);

    expect(() => service.parseState(state)).toThrow(UnauthorizedException);
    nowSpy.mockRestore();
  });

  it('throws UnauthorizedException when secret is not configured', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => service.createState()).toThrow(UnauthorizedException);
  });
});
