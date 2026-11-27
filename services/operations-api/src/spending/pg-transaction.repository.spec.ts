import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { freshTestPool, TEST_DATABASE_URL } from '../db/test-database';
import { PgTransactionRepository } from './pg-transaction.repository';

// These need a PostgreSQL database: set TEST_DATABASE_URL to run them (CI provides one).
const NOW = new Date('2026-11-27T12:00:00Z');

describe.skipIf(!TEST_DATABASE_URL)('PgTransactionRepository', () => {
  let pool: Pool;
  let repo: PgTransactionRepository;
  let n = 0;

  const add = (
    customer: string,
    kind: string,
    amount: number,
    category: string | null,
    postedAt: string,
    status = 'posted',
  ) =>
    pool.query(
      `INSERT INTO transactions (id, customer_id, kind, status, amount_minor, category, description, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'test', $7)`,
      [`t${++n}`, customer, kind, status, amount, category, postedAt],
    );

  beforeAll(async () => {
    pool = await freshTestPool();
    repo = new PgTransactionRepository(pool);
    for (const id of ['cust-a', 'cust-b', 'cust-c', 'cust-none']) {
      await pool.query('INSERT INTO people (id, display_name) VALUES ($1, $1)', [id]);
    }
    await add('cust-a', 'card_purchase', 1500, 'Groceries', '2026-11-10T10:00:00Z');
    await add('cust-a', 'debit', 900, 'Groceries', '2026-11-12T10:00:00Z');
    await add('cust-a', 'card_purchase', 2000, 'Dining', '2026-11-15T10:00:00Z');
    await add('cust-a', 'card_purchase', 5000, 'Travel', '2026-10-15T10:00:00Z');
    await add('cust-a', 'card_purchase', 5000, 'Groceries', '2026-10-20T10:00:00Z');
    await add('cust-a', 'card_purchase', 7777, 'Dining', '2026-11-16T10:00:00Z', 'pending');
    await add('cust-a', 'transfer_in', 50000, 'Transfers', '2026-11-05T10:00:00Z');
    await add('cust-a', 'fee', 500, 'Fees', '2026-11-06T10:00:00Z');
    await add('cust-a', 'debit', 1100, null, '2026-11-07T10:00:00Z');
    await add('cust-b', 'card_purchase', 9999, 'Groceries', '2026-11-10T10:00:00Z');
    // 00:30 on 1 November in Auckland (UTC+13), still October in UTC
    await add('cust-c', 'card_purchase', 1200, 'Shopping', '2026-10-31T11:30:00Z');
    await add('cust-c', 'card_purchase', 800, 'Shopping', '2026-11-30T23:30:00Z');
  });

  afterAll(async () => {
    await pool?.end();
  });

  const totals = async (customer: string, zone = 'Europe/London') =>
    Object.fromEntries(
      (await repo.sumMonthlySpendingByCategory(customer, zone, NOW)).map((r) => [
        r.category ?? 'null',
        r.totalMinor,
      ]),
    );

  it('sums posted debits and card purchases per category, largest first', async () => {
    const rows = await repo.sumMonthlySpendingByCategory('cust-a', 'Europe/London', NOW);
    expect(rows.slice(0, 2)).toEqual([
      { category: 'Dining', totalMinor: 2000 },
      { category: 'Groceries', totalMinor: 2400 },
    ]);
  });

  it('excludes the previous month', async () => {
    const t = await totals('cust-a');
    expect(t.Travel).toBeUndefined();
    expect(t.Groceries).toBe(2400);
  });

  it("excludes another customer's transactions", async () => {
    expect((await totals('cust-a', 'UTC')).Groceries).toBe(2400);
    expect(await repo.sumMonthlySpendingByCategory('cust-none', 'UTC', NOW)).toEqual([]);
  });

  it('excludes pending purchases, transfers in and fees', async () => {
    const t = await totals('cust-a');
    expect(t.Dining).toBe(2000);
    expect(Object.keys(t)).not.toContain('Transfers');
    expect(Object.keys(t)).not.toContain('Fees');
  });

  it('returns uncategorised spending with a null category', async () => {
    expect(await repo.sumMonthlySpendingByCategory('cust-a', 'UTC', NOW)).toContainEqual({
      category: null,
      totalMinor: 1100,
    });
  });

  it("uses the customer's local month boundary", async () => {
    expect((await totals('cust-c', 'Pacific/Auckland')).Shopping).toBe(1200);
    expect((await totals('cust-c', 'UTC')).Shopping).toBe(undefined);
    // 30 Nov 23:30 UTC is still November in New York
    expect((await totals('cust-c', 'America/New_York')).Shopping).toBe(800);
  });
});
