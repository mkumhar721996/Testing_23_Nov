import { describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';
import { SAMPLE_CUSTOMERS } from './sample-data';
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

  it('lists exactly eight recent transactions, newest first, for a busy customer', async () => {
    const { recentTransactions: list } = await service.getOverview('cust-maya');
    expect(list).toHaveLength(8);
    const dates = list.map((t) => t.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(dates[0]).toBe('2026-11-22');
  });

  it('never lists loan or fixed deposit transactions', async () => {
    const { recentTransactions: list } = await service.getOverview('cust-maya');
    expect(list.some((t) => ['maya-loan-1', 'maya-fd-1'].includes(t.productId))).toBe(false);
  });

  it('lists transactions from accounts and credit cards', async () => {
    const { recentTransactions: list, products } = await service.getOverview('cust-maya');
    const types = new Set(list.map((t) => products.find((p) => p.id === t.productId)?.type));
    expect(types).toEqual(new Set(['account', 'credit_card']));
  });

  it("lists no transaction of another customer's", async () => {
    const { recentTransactions: list } = await service.getOverview('cust-maya');
    const other = SAMPLE_CUSTOMERS['cust-two-cards'].transactions.map((t) => t.id);
    expect(list.some((t) => other.includes(t.id))).toBe(false);
  });

  it("shows each amount in its product's currency", async () => {
    const { recentTransactions: list, products } = await service.getOverview('cust-two-cards');
    for (const t of list) {
      expect(t.amount.currency).toBe(products.find((p) => p.id === t.productId)?.currency);
    }
    expect(new Set(list.map((t) => t.amount.currency))).toEqual(new Set(['USD', 'GBP']));
  });

  it('lists only the existing transactions when fewer than eight', async () => {
    const { recentTransactions: list } = await service.getOverview('cust-no-fd');
    expect(list).toHaveLength(SAMPLE_CUSTOMERS['cust-no-fd'].transactions.length);
  });

  it('returns no transactions for an unknown subject', async () => {
    expect((await service.getOverview('unknown')).recentTransactions).toEqual([]);
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
