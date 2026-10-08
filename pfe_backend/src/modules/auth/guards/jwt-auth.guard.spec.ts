import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let superCanActivate: jest.SpyInstance;

  const makeContext = (): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as any);

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);

    // AuthGuard('jwt') is a dynamically generated class; spy on the parent
    // prototype's canActivate so we control passport's underlying behavior.
    const parentPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype);
    superCanActivate = jest.spyOn(parentPrototype, 'canActivate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(guard).toBeDefined();
  });

  it('delegates to passport and returns true when the route is not public and auth succeeds', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    superCanActivate.mockReturnValue(true);

    const result = guard.canActivate(makeContext());

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
    expect(superCanActivate).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('propagates a denial from passport when the route is not public', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    superCanActivate.mockImplementation(() => {
      throw new Error('Unauthorized');
    });

    expect(() => guard.canActivate(makeContext())).toThrow('Unauthorized');
  });

  it('allows access on a @Public route even when passport throws synchronously', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    superCanActivate.mockImplementation(() => {
      throw new Error('invalid token');
    });

    const result = guard.canActivate(makeContext());

    expect(result).toBe(true);
  });

  it('allows access on a @Public route and swallows a rejected promise from passport', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    superCanActivate.mockReturnValue(Promise.reject(new Error('bad token')));

    const result = guard.canActivate(makeContext());

    expect(result).toBe(true);
    // let the swallowed rejection's catch handler run without an unhandled rejection
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('allows access on a @Public route when passport resolves normally', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    superCanActivate.mockReturnValue(true);

    const result = guard.canActivate(makeContext());

    expect(result).toBe(true);
  });
});
