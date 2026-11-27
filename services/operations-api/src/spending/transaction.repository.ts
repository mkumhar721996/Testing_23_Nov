import type { CategoryTotal } from './spending.types';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface TransactionRepository {
  /** Posted debits and card purchases in the calendar month containing `now` in `timeZone`, for one customer. */
  sumMonthlySpendingByCategory(
    customerId: string,
    timeZone: string,
    now: Date,
  ): Promise<CategoryTotal[]>;
}
