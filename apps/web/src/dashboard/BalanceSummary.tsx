import { formatMoney } from './format';
import type { DashboardData } from './types';

export function BalanceSummary({ data }: { data: DashboardData }) {
  const count = data.accounts.length;
  return (
    <section className="grid grid-3" aria-label="Balance summary">
      <div className="card stat">
        <span className="stat-label">Total balance</span>
        <span className="stat-value">{formatMoney(data.totalBalance, data.currency)}</span>
        <span className="stat-delta">
          across {count} {count === 1 ? 'account' : 'accounts'}
        </span>
      </div>
      <div className="card stat">
        <span className="stat-label">Money in, this month</span>
        <span className="stat-value">{formatMoney(data.moneyInThisMonth, data.currency)}</span>
      </div>
      <div className="card stat">
        <span className="stat-label">Money out, this month</span>
        <span className="stat-value">{formatMoney(data.moneyOutThisMonth, data.currency)}</span>
      </div>
    </section>
  );
}
