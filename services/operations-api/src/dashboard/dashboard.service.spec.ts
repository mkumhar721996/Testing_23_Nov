import { describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';
import { SampleProductRepository } from './sample-product.repository';

const service = new DashboardService(new SampleProductRepository());

describe('DashboardService.getOverview', () => {
  it('returns two credit cards for a customer holding two', async () => {
    const { products } = await service.getOverview('cust-two-cards');
    expect(products.filter((p) => p.type === 'credit_card')).toHaveLength(2);
  });

  it('returns no fixed deposit for a customer holding none', async () => {
    const { products } = await service.getOverview('cust-no-fd');
    expect(products.some((p) => p.type === 'fixed_deposit')).toBe(false);
  });

  it('returns a null name when the profile has none', async () => {
    expect((await service.getOverview('cust-no-name')).customer.name).toBeNull();
  });

  it('returns nothing for an unknown subject', async () => {
    expect((await service.getOverview('unknown')).products).toEqual([]);
    expect((await service.getOverview('__proto__')).products).toEqual([]);
  });

  it('orders products by type', async () => {
    const { products } = await service.getOverview('cust-maya');
    expect(products.map((p) => p.type)).toEqual([
      'account',
      'account',
      'credit_card',
      'loan',
      'fixed_deposit',
    ]);
  });
});
