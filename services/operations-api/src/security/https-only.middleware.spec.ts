import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { httpsOnly } from './https-only.middleware';

function run(req: Partial<Request>, required = true) {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
  };
  const next = vi.fn();
  httpsOnly({ required })(req as Request, res as unknown as Response, next);
  return { res, next };
}

describe('httpsOnly', () => {
  it('refuses plain HTTP with 426 and no data', () => {
    const { res, next } = run({ secure: false, path: '/onboarding-records' });
    expect(res.statusCode).toBe(426);
    expect(res.body).toEqual({ message: 'HTTPS is required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes secure requests and sets HSTS', () => {
    const { res, next } = run({ secure: true, path: '/onboarding-records' });
    expect(next).toHaveBeenCalled();
    expect(res.headers['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('exempts /health', () => {
    expect(run({ secure: false, path: '/health' }).next).toHaveBeenCalled();
  });

  it('does nothing when not required', () => {
    expect(run({ secure: false, path: '/x' }, false).next).toHaveBeenCalled();
  });
});
