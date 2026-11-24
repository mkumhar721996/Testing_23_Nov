import type { Product, Transaction } from './dashboard.types';

export const RECENT_TRANSACTION_LIMIT = 8;

// Account and credit card transactions of the given products only, newest first.
export function selectRecentTransactions(
  products: Product[],
  transactions: Transaction[],
  limit = RECENT_TRANSACTION_LIMIT,
): Transaction[] {
  const eligible = new Set(
    products.filter((p) => p.type === 'account' || p.type === 'credit_card').map((p) => p.id),
  );
  return transactions
    .filter((t) => eligible.has(t.productId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, limit);
}
