import { ComingSoon } from './ComingSoon';
import { formatMoney } from './format';
import type { Account } from './types';

export function AccountList({ accounts, currency }: { accounts: Account[]; currency: string }) {
  return (
    <section className="card" aria-labelledby="h-accounts">
      <div className="card-header">
        <h2 id="h-accounts">Your accounts</h2>
      </div>
      <ul className="list">
        {accounts.map((a) => (
          <li className="row-item" key={a.id}>
            <span>
              {a.name} <span className="mono">{a.maskedNumber}</span>
              {a.note && <span className="row-sub">{a.note}</span>}
            </span>
            {a.balance < 0 ? (
              <span className="amt">{formatMoney(a.balance, currency).replace('-', '−')} owed</span>
            ) : (
              <strong className="amt">{formatMoney(a.balance, currency)}</strong>
            )}
          </li>
        ))}
      </ul>
      <ComingSoon variant="link">View all accounts</ComingSoon>
    </section>
  );
}
