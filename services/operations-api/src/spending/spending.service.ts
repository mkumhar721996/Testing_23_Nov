import { Inject, Injectable, Optional } from '@nestjs/common';
import { TRANSACTION_REPOSITORY, type TransactionRepository } from './transaction.repository';
import type { MonthlySpendingResponse } from './spending.types';

export const CLOCK = Symbol('CLOCK');
const FALLBACK_TIME_ZONE = 'UTC';
const CURRENCY = 'GBP';

function validTimeZone(timeZone: string | undefined): string {
  if (!timeZone) return FALLBACK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
    return timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

function monthIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}`;
}

@Injectable()
export class SpendingService {
  private readonly now: () => Date;

  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactions: TransactionRepository,
    @Optional() @Inject(CLOCK) clock?: () => Date,
  ) {
    this.now = clock ?? (() => new Date());
  }

  async getMonthly(customerId: string, timeZone?: string): Promise<MonthlySpendingResponse> {
    const zone = validTimeZone(timeZone);
    const now = this.now();
    const rows = await this.transactions.sumMonthlySpendingByCategory(customerId, zone, now);
    const categories = rows.filter((row) => row.totalMinor > 0);
    return {
      month: monthIn(zone, now),
      currency: CURRENCY,
      totalMinor: categories.reduce((sum, row) => sum + row.totalMinor, 0),
      categories,
    };
  }
}
