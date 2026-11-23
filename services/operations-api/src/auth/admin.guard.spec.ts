import { describe, expect, it } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

const ctx = (principal?: { userId: string; roles: string[] }) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ principal }) }) }) as never;

describe('AdminGuard', () => {
  const guard = new AdminGuard();
  it('allows admins', () => {
    expect(guard.canActivate(ctx({ userId: 'a', roles: ['admin'] }))).toBe(true);
  });
  it('refuses non-admins with not_admin', () => {
    expect(() => guard.canActivate(ctx({ userId: 'u', roles: ['user'] }))).toThrow(ForbiddenException);
  });
  it('refuses a request with no principal', () => {
    expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException);
  });
});
