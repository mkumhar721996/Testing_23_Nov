import { fetchRecentTrips } from './dashboard-api';
import { formatCount, formatDateRange, formatEarnings } from './format';
import { useWidgetData } from './useWidgetData';
import WidgetError from './WidgetError';

export default function RecentTrips({ onComingSoon }: { onComingSoon: (featureName: string) => void }) {
  const { status, data, retry } = useWidgetData(fetchRecentTrips, []);
  const total = {
    amountMinor: data.reduce((sum, trip) => sum + trip.expenses.amountMinor, 0),
    currency: data[0]?.expenses.currency ?? 'USD',
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Recent trips</h2>
        <button className="btn btn-secondary" type="button" onClick={() => onComingSoon('Recent trips')}>
          View all
        </button>
      </div>
      {status === 'loading' && (
        <div aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div className="sk-row" key={i}>
              <span className="skeleton" />
            </div>
          ))}
        </div>
      )}
      {status === 'error' && (
        <WidgetError
          title="We couldn't load recent trips."
          hint="The Operations API didn't respond. Try again in a moment."
          onRetry={retry}
        />
      )}
      {status === 'empty' && (
        <div className="empty-state">
          <h3 style={{ margin: 0 }}>No recent trips</h3>
          <p style={{ margin: 0 }}>Completed trips and their expenses will show here.</p>
        </div>
      )}
      {status === 'ready' && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Dates</th>
                  <th>Travelers</th>
                  <th className="num">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {data.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.destination}</td>
                    <td>{formatDateRange(trip.startDate, trip.endDate)}</td>
                    <td>{formatCount(trip.travelers)}</td>
                    <td className="num">{formatEarnings(trip.expenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="num-total">
            <span className="text-muted">Total expenses, last {data.length} trips</span>
            <strong>{formatEarnings(total)}</strong>
          </div>
        </>
      )}
    </div>
  );
}
