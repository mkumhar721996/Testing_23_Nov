import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import type { OnboardingRepository } from '../onboarding/onboarding.repository';
import { AuthGuard } from './auth.guard';
import type { TokenVerifier } from './token-verifier';

const verifier: TokenVerifier = {
  async verify(bearer) {
    if (bearer === 'valid') return { oid: 'oid-1', roles: ['employee', 'manager'], name: 'Maya' };
    if (bearer === 'norole') return { oid: 'oid-2', roles: [], name: 'Nobody' };
    throw new Error(`rejected: ${bearer}`);
  },
};
const repo = {
  async findEmployeeByOid(oid: string) {
    return oid === 'oid-1' ? { id: 'emp-1' } : null;
  },
} as unknown as OnboardingRepository;

function ctx(headers: Record<string, string>, isPublic = false) {
  const req: Record<string, unknown> = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => (isPublic ? publicHandler : plainHandler),
    getClass: () => class {},
  } as unknown as ExecutionContext;
  return { req, context };
}
const plainHandler = () => undefined;
const publicHandler = () => undefined;
Reflect.defineMetadata('isPublic', true, publicHandler);

const guard = new AuthGuard(new Reflector(), verifier, repo);

describe('AuthGuard', () => {
  it('lets a @Public route through without a token', async () => {
    expect(await guard.canActivate(ctx({}, true).context)).toBe(true);
  });

  it.each([
    ['no header', {}],
    ['a non-bearer header', { authorization: 'Basic abc' }],
    ['a garbage token', { authorization: 'Bearer garbage' }],
    ['an expired token', { authorization: 'Bearer expired' }],
    ['a wrong-audience token', { authorization: 'Bearer wrong-audience' }],
  ])('rejects %s with 401', async (_name, headers) => {
    await expect(guard.canActivate(ctx(headers).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the principal with the highest role and the employee id', async () => {
    const { req, context } = ctx({ authorization: 'Bearer valid' });
    expect(await guard.canActivate(context)).toBe(true);
    expect(req.principal).toEqual({
      oid: 'oid-1',
      role: 'manager',
      employeeId: 'emp-1',
      displayName: 'Maya',
    });
  });

  it('refuses a signed-in person with no app role', async () => {
    await expect(guard.canActivate(ctx({ authorization: 'Bearer norole' }).context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
