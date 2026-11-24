import { formatMask, formatShortDate, formatTransactionAmount } from './format';
import type { Product, Transaction } from './types';

type Props = { transactions: Transaction[]; products: Product[]; onViewAll: () => void };

// Renders exactly the list it is given; the API owns which transactions and in what order.
export default function RecentTransactions({ transactions, products, onViewAll }: Props) {
  return (
    <section className="stack" aria-label="Recent transactions">
      <div className="cluster cluster-between">
        <h2 className="section-title">Recent transactions</h2>
        <a
          href="#"
          onClick={(event) => {
            event.preventDefault();
            onViewAll();
          }}
        >
          View all
        </a>
      </div>
      {transactions.length > 0 && (
        <div className="card card-flush" role="list" aria-label="Recent transactions, newest first">
          {transactions.map((t) => {
            const product = products.find((p) => p.id === t.productId);
            const parts = [
              t.category,
              product ? `${product.name} ${formatMask(product.last4)}` : null,
              formatShortDate(t.date),
            ].filter(Boolean);
            return (
              <div className="txn" role="listitem" key={t.id}>
                <div>
                  <div>{t.description}</div>
                  <div className="meta">{parts.join(' · ')}</div>
                </div>
                <span className={t.amount.amountMinor > 0 ? 'amt in' : 'amt'}>
                  {formatTransactionAmount(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
