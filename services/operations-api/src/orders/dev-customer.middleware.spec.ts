import { describe, expect, it, vi } from 'vitest';
import { devCustomerMiddleware } from './dev-customer.middleware';

describe('devCustomerMiddleware', () => {
  it('sets customerId on the request from the configured value', () => {
    const req: { customerId?: string } = {};
    const next = vi.fn();
    devCustomerMiddleware('customer-1')(req, {}, next);
    expect(req.customerId).toBe('customer-1');
    expect(next).toHaveBeenCalledOnce();
  });
});
