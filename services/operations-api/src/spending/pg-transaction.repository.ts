import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import type { TransactionRepository } from './transaction.repository';
import type { CategoryTotal } from './spending.types';

// The customer scope, posted-only rule, kind filter and local-month window all live in this one query.
const MONTHLY_SPENDING = `
  SELECT category, sum(amount_minor)::bigint AS total_minor
    FROM transactions
   WHERE customer_id = $1
     AND status = 'posted'
     AND kind IN ('debit', 'card_purchase')
     AND posted_at >= date_trunc('month', $3::timestamptz AT TIME ZONE $2) AT TIME ZONE $2
     AND posted_at <  (date_trunc('month', $3::timestamptz AT TIME ZONE $2) + interval '1 month') AT TIME ZONE $2
   GROUP BY category
   ORDER BY total_minor DESC, category ASC NULLS LAST`;

@Injectable()
export class PgTransactionRepository implements TransactionRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async sumMonthlySpendingByCategory(
    customerId: string,
    timeZone: string,
    now: Date,
  ): Promise<CategoryTotal[]> {
    const { rows } = await this.pool.query<{ category: string | null; total_minor: string }>(
      MONTHLY_SPENDING,
      [customerId, timeZone, now],
    );
    return rows.map((row) => ({ category: row.category, totalMinor: Number(row.total_minor) }));
  }
}
