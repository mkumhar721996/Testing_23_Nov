import { formatDateRange, formatDay } from '../dashboard/format';
import { highlight } from './highlight';
import type { BookingStatus, SearchResults as Results } from './types';

type Props = {
  status: 'searching' | 'results' | 'no-results' | 'error';
  query: string;
  results: Results | null;
  onClear: () => void;
  onRetry: () => void;
  onOpen: (label: string) => void;
};

const STATUS_BADGE: Record<BookingStatus, string> = {
  Confirmed: 'badge-success',
  Pending: 'badge-warning',
  Cancelled: 'badge-danger',
};

function plural(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export default function SearchResults({ status, query, results, onClear, onRetry, onOpen }: Props) {
  if (status === 'searching') {
    return (
      <div className="card results" aria-busy="true">
        <div className="card-header">
          <h2 className="card-title">Searching trips and bookings…</h2>
        </div>
        <div className="stack">
          <span className="skeleton" style={{ width: '30%' }} />
          <span className="skeleton" style={{ height: 'var(--space-4)' }} />
          <span className="skeleton" style={{ height: 'var(--space-4)' }} />
          <span className="skeleton" style={{ width: '30%' }} />
          <span className="skeleton" style={{ height: 'var(--space-4)' }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="results">
        <div className="alert alert-danger" role="alert">
          <div>
            <strong>We couldn't run your search.</strong>
            <p className="hint" style={{ color: 'inherit' }}>
              The Operations API didn't respond. Your trips and bookings are safe — try the search again.
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'no-results' || !results) {
    return (
      <div className="card results">
        <div className="empty-state">
          <h2 className="card-title">No trips or bookings match “{query}”</h2>
          <p style={{ margin: 0 }}>
            Check the spelling or try a shorter part of the name, such as a destination or a family name.
          </p>
          <button className="btn btn-primary" type="button" onClick={onClear}>
            Clear search
          </button>
        </div>
      </div>
    );
  }

  const { trips, bookings } = results;
  return (
    <div className="card results" role="region" aria-label="Search results">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            {plural(trips.length + bookings.length, 'result')} for “{query}”
          </h2>
          <p className="hint">
            {plural(trips.length, 'trip')} and {plural(bookings.length, 'booking')} with “{query}” in the name
          </p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onClear}>
          Clear search
        </button>
      </div>
      <div className="res-group">
        <h3>
          Trips <span className="badge badge-primary">{trips.length}</span>
        </h3>
        {trips.length === 0 ? (
          <p className="res-empty">No trips match “{query}”.</p>
        ) : (
          <ul className="res-list">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button className="res-row" type="button" onClick={() => onOpen(`Details for Trip ${trip.id}`)}>
                  <span className="res-name">
                    <strong>{highlight(trip.name, query)}</strong>
                    <span>
                      {trip.id}, {formatDateRange(trip.startDate, trip.endDate)}
                    </span>
                  </span>
                  <span className="badge badge-info">Trip</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="res-group">
        <h3>
          Bookings <span className="badge badge-primary">{bookings.length}</span>
        </h3>
        {bookings.length === 0 ? (
          <p className="res-empty">No bookings match “{query}”.</p>
        ) : (
          <ul className="res-list">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <button
                  className="res-row"
                  type="button"
                  onClick={() => onOpen(`Details for Booking ${booking.id}`)}
                >
                  <span className="res-name">
                    <strong>{highlight(booking.name, query)}</strong>
                    <span>
                      {booking.id}, booked {formatDay(booking.bookedOn)}
                    </span>
                  </span>
                  <span className={`badge ${STATUS_BADGE[booking.status]}`}>{booking.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
