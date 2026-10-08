import { JwtRefreshGuard } from './jwt-refresh.guard';

describe('JwtRefreshGuard', () => {
  it('is defined', () => {
    const guard = new JwtRefreshGuard();
    expect(guard).toBeDefined();
  });

  it('inherits canActivate from the passport AuthGuard base class', () => {
    const guard = new JwtRefreshGuard();
    expect(typeof guard.canActivate).toBe('function');
    // No own override: behavior is delegated entirely to the "jwt-refresh" strategy.
    expect(
      Object.prototype.hasOwnProperty.call(
        JwtRefreshGuard.prototype,
        'canActivate',
      ),
    ).toBe(false);
  });
});
