import { ComingSoon } from './ComingSoon';

export function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <p className="note">Loading your accounts…</p>
      <div className="stack-lg stack">
        <div className="grid grid-3">
          {[0, 1, 2].map((i) => (
            <div className="card stack-sm stack" key={i}>
              <span className="skeleton sk sk-md"></span>
              <span className="skeleton sk sk-lg"></span>
            </div>
          ))}
        </div>
        <div className="cols">
          <div className="card">
            <span className="skeleton sk sk-lg"></span>
            {[0, 1, 2, 3, 4].map((i) => (
              <span className="skeleton sk sk-row" key={i}></span>
            ))}
          </div>
          <div className="card">
            <span className="skeleton sk sk-lg"></span>
            {[0, 1, 2].map((i) => (
              <span className="skeleton sk sk-row" key={i}></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="state-center card">
      <div className="empty-state">
        <h2>No accounts yet</h2>
        <p>Open an account to see your balances and transactions here.</p>
        <ComingSoon variant="primary">Open an account</ComingSoon>
      </div>
    </div>
  );
}

export function ErrorState({ retried, onRetry }: { retried: boolean; onRetry: () => void }) {
  return (
    <div className="stack">
      <div className="alert alert-danger" role="alert">
        {retried
          ? 'We still could not load your balances. Your money is safe; please try again in a moment.'
          : 'We could not load your balances. Your money is safe; please try again.'}
      </div>
      <div className="state-center card">
        <div className="empty-state">
          <h2>Dashboard unavailable</h2>
          <p>
            {retried
              ? 'The dashboard did not reload. Try again; if it keeps happening, come back a little later.'
              : 'Your balances, accounts and transactions did not load. Check your connection, then try again.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
