import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const makeContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any);

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('is defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows access when the route has no required roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(
      makeContext({ id: 'u1', role: Role.CANDIDATE }),
    );

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('allows access when the required roles array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    const result = guard.canActivate(
      makeContext({ id: 'u1', role: Role.CANDIDATE }),
    );

    expect(result).toBe(true);
  });

  it('throws ForbiddenException when no user is attached to the request', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when the user does not have a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(makeContext({ id: 'u1', role: Role.CANDIDATE })),
    ).toThrow(ForbiddenException);
  });

  it('allows access when the user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.RECRUITER]);

    const result = guard.canActivate(
      makeContext({ id: 'u1', role: Role.RECRUITER }),
    );

    expect(result).toBe(true);
  });
});
