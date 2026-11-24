import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';

const verifier = {
  verify: async (token: string) => {
    if (token !== 'good') throw new Error('bad token');
    return { subject: 'cust-1' };
  },
};

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
}

describe('AuthGuard', () => {
  it('sets customerId from the verified token', async () => {
    const request = { headers: { authorization: 'Bearer good' } } as AuthenticatedRequest;
    await expect(new AuthGuard(verifier).canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.customerId).toBe('cust-1');
  });

  it('rejects a missing header', async () => {
    const request = { headers: {} } as AuthenticatedRequest;
    await expect(new AuthGuard(verifier).canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an invalid token', async () => {
    const request = { headers: { authorization: 'Bearer nope' } } as AuthenticatedRequest;
    await expect(new AuthGuard(verifier).canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
