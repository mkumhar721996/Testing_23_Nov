import { fetchUpcomingTrips } from './dashboard-api';
import { formatShortDateRange } from './format';
import { useWidgetData } from './useWidgetData';
import WidgetError from './WidgetError';

export default function UpcomingTrips({ onComingSoon }: { onComingSoon: (featureName: string) => void }) {
  const { status, data, retry } = useWidgetData(fetchUpcomingTrips, []);

  return (
    <div className="stack-sm">
      <div className="cluster cluster-between">
        <h2 className="card-title">Upcoming trips</h2>
        <button
          className="btn btn-primary btn-icon"
          type="button"
          aria-label="Add trip"
          onClick={() => onComingSoon('Adding a trip')}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#i-plus" />
          </svg>
        </button>
      </div>
      {status === 'loading' && (
        <div className="stack-sm" aria-busy="true">
          {[0, 1].map((i) => (
            <div className="card trip" key={i}>
              <span className="skeleton ph-sm" />
              <span className="skeleton" style={{ flex: 1, height: 'var(--space-4)' }} />
            </div>
          ))}
        </div>
      )}
      {status === 'error' && (
        <WidgetError title="We couldn't load upcoming trips." hint="Try again in a moment." onRetry={retry} />
      )}
      {status === 'empty' && (
        <div className="card">
          <p className="hint">No upcoming trips. Add one with the plus button.</p>
        </div>
      )}
      {status === 'ready' &&
        data.map((trip) => (
          <div className="card trip" key={trip.id}>
            <div className="ph ph-sm" role="img" aria-label={`${trip.destination} trip image`} />
            <div className="trip-info">
              <span className="chip">{trip.kind}</span>
              <strong>{trip.destination}</strong>
              <span className="text-muted text-sm">{formatShortDateRange(trip.startDate, trip.endDate)}</span>
            </div>
          </div>
        ))}
    </div>
  );
}
