import { formatCount, formatEarnings } from './format';
import { useDashboardStats } from './useDashboardStats';

export default function StatTiles() {
  const { status, stats, retry } = useDashboardStats();

  if (status === 'loading') {
    return (
      <div className="grid grid-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div className="card stat" key={i}>
            <span className="skeleton" style={{ width: '60%' }} />
            <span className="skeleton" style={{ height: 'var(--space-4)', width: '40%' }} />
            <span className="skeleton" style={{ width: '30%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="alert alert-danger tile-error" role="alert">
        <div>
          <strong>We couldn't load your totals.</strong>
          <p className="hint" style={{ color: 'inherit' }}>
            The Operations API didn't respond. Your data is safe — try again in a moment.
          </p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  if (status === 'empty' || !stats) {
    return (
      <div className="card empty-state">
        <h3 style={{ margin: 0 }}>No travel totals yet</h3>
        <p style={{ margin: 0 }}>
          Bookings, customers and earnings appear here once the Operations API has sample travel data.
        </p>
        <button className="btn btn-primary" type="button" onClick={retry}>
          Reload data
        </button>
      </div>
    );
  }

  const tiles = [
    { id: 'bookings', label: 'Total bookings', value: formatCount(stats.bookings) },
    { id: 'customers', label: 'Total customers', value: formatCount(stats.customers) },
    { id: 'earnings', label: 'Total earnings', value: formatEarnings(stats.earnings) },
  ];
  return (
    <div className="grid grid-3">
      {tiles.map((tile) => (
        <div className="card stat" key={tile.id}>
          <span className="stat-label">{tile.label}</span>
          <strong className="stat-value">{tile.value}</strong>
          <span className="stat-note">All time</span>
        </div>
      ))}
    </div>
  );
}
