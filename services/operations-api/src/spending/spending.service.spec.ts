import { describe, expect, it, vi } from 'vitest';
import { SpendingService } from './spending.service';
import type { TransactionRepository } from './transaction.repository';
import type { CategoryTotal } from './spending.types';

const NOW = new Date('2026-11-27T12:00:00Z');

function setup(rows: CategoryTotal[]) {
  const repo: TransactionRepository = {
    sumMonthlySpendingByCategory: vi.fn(async () => rows),
  };
  return { repo, service: new SpendingService(repo, () => NOW) };
}

describe('SpendingService', () => {
  it('returns an empty category list and zero total when there is no spending', async () => {
    const { service } = setup([]);
    expect(await service.getMonthly('cust-a', 'Europe/London')).toMatchObject({
      categories: [],
      totalMinor: 0,
      month: '2026-11',
    });
  });

  it('totals the categories and keeps the null category', async () => {
    const { service } = setup([
      { category: 'Groceries', totalMinor: 2400 },
      { category: null, totalMinor: 1100 },
    ]);
    const result = await service.getMonthly('cust-a', 'UTC');
    expect(result.totalMinor).toBe(3500);
    expect(result.currency).toBe('GBP');
    expect(result.categories).toContainEqual({ category: null, totalMinor: 1100 });
  });

  it('drops zero totals', async () => {
    const { service } = setup([
      { category: 'Groceries', totalMinor: 2400 },
      { category: 'Dining', totalMinor: 0 },
    ]);
    expect((await service.getMonthly('cust-a', 'UTC')).categories).toEqual([
      { category: 'Groceries', totalMinor: 2400 },
    ]);
  });

  it('falls back to UTC for a missing or invalid time zone', async () => {
    const { repo, service } = setup([]);
    await service.getMonthly('cust-a', undefined);
    await service.getMonthly('cust-a', 'Not/AZone');
    expect(repo.sumMonthlySpendingByCategory).toHaveBeenNthCalledWith(1, 'cust-a', 'UTC', NOW);
    expect(repo.sumMonthlySpendingByCategory).toHaveBeenNthCalledWith(2, 'cust-a', 'UTC', NOW);
  });

  it('reports the month in the customer time zone', async () => {
    const { service } = setup([]);
    const late = new SpendingService(
      { sumMonthlySpendingByCategory: async () => [] },
      () => new Date('2026-11-30T23:30:00Z'),
    );
    expect((await late.getMonthly('c', 'Pacific/Auckland')).month).toBe('2026-12');
    expect((await service.getMonthly('c', 'UTC')).month).toBe('2026-11');
  });
});
