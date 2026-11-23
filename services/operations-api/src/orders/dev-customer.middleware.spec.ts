import { describe, expect, it, vi } from 'vitest';
import { devCustomerMiddleware, devCustomerIdFromEnv } from './dev-customer.middleware';

describe('devCustomerIdFromEnv', () => {
  it('is enabled only when NODE_ENV is explicitly development and an id is set', () => {
    expect(devCustomerIdFromEnv({ NODE_ENV: 'development', DEV_CUSTOMER_ID: 'c1' })).toBe('c1');
  });

  it.each([undefined, 'production', 'staging', 'test'])('is off when NODE_ENV is %s', (nodeEnv) => {
    expect(devCustomerIdFromEnv({ NODE_ENV: nodeEnv, DEV_CUSTOMER_ID: 'c1' })).toBeUndefined();
  });

  it('is off when no id is configured', () => {
    expect(devCustomerIdFromEnv({ NODE_ENV: 'development' })).toBeUndefined();
  });
});

describe('devCustomerMiddleware', () => {
  it('sets customerId on the request from the configured value', () => {
    const req: { customerId?: string } = {};
    const next = vi.fn();
    devCustomerMiddleware('customer-1')(req, {}, next);
    expect(req.customerId).toBe('customer-1');
    expect(next).toHaveBeenCalledOnce();
  });
});
