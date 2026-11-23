import { describe, expect, it } from 'vitest';
import { InMemoryOrderRepository } from './in-memory-order.repository';
import type { Order } from './order.repository';

const placed: Order = {
  id: '1',
  customerId: 'c1',
  restaurant: 'Harbor Noodle House',
  placedAt: '2026-11-23T12:14:00Z',
  status: 'placed',
  items: [{ name: 'Beef pho', quantity: 1, price: 12.5 }],
  total: 12.5,
  currency: 'GBP',
};

describe('InMemoryOrderRepository', () => {
  it('lets exactly one of cancel and accept win, cancel first', async () => {
    const repo = new InMemoryOrderRepository([placed]);
    const [a, b] = await Promise.all([repo.cancelIfPlaced('1'), repo.accept('1')]);
    expect([a === 'not-cancellable', b === 'not-acceptable'].filter(Boolean)).toHaveLength(1);
    expect((await repo.findById('1'))?.status).toBe('cancelled');
  });

  it('lets exactly one of cancel and accept win, accept first', async () => {
    const repo = new InMemoryOrderRepository([placed]);
    const [b, a] = await Promise.all([repo.accept('1'), repo.cancelIfPlaced('1')]);
    expect([a === 'not-cancellable', b === 'not-acceptable'].filter(Boolean)).toHaveLength(1);
    expect((await repo.findById('1'))?.status).toBe('accepted');
  });
});
