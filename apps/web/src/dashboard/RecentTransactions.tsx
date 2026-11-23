import { ComingSoon } from './ComingSoon';
import { formatSigned, relativeDay } from './format';
import type { Transaction } from './types';

export function RecentTransactions({
  transactions,
  currency,
}: {
  transactions: Transaction[];
  currency: string;
}) {
  const now = new Date();
  return (
    <section className="card" aria-labelledby="h-txn">
      <div className="card-header">
        <h2 id="h-txn">Recent transactions</h2>
        <ComingSoon variant="link">See all</ComingSoon>
      </div>
      <ul className="list">
        {transactions.map((t) => (
          <li className="row-item" key={t.id}>
            <span>
              {t.payee}
              <span className="row-sub">
                {relativeDay(t.date, now)}, {t.accountName}
              </span>
            </span>
            <span className={t.amount > 0 ? 'amt amt-in' : 'amt'}>
              {formatSigned(t.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
