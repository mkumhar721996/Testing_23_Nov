import { useEffect, useRef } from 'react';
import { formatDate, formatTripRange } from './calendar';
import type { Trip } from './types';

type Props = { date: string; trips: Trip[]; onClose: () => void };

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export default function DayPanel({ date, trips, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const label = formatDate(date);

  useEffect(() => {
    panel.current?.focus();
  }, [date]);

  return (
    <div className="card day-panel" role="region" aria-label={`Trips on ${label}`} tabIndex={-1} ref={panel}>
      <div className="card-header" style={{ margin: 0 }}>
        <h2 className="card-title">{label}</h2>
        <button className="btn btn-secondary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div aria-live="polite">
        {trips.length > 0 ? (
          <div className="day-trips">
            {trips.map((trip) => (
              <div className="day-trip" key={trip.id}>
                <span className="chip">{sentenceCase(trip.type)}</span>
                <strong>{trip.destination}</strong>
                <span className="text-muted text-sm">Trip days {formatTripRange(trip)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="day-empty">
            <strong>No trips on {label}</strong>
            <p className="hint">Trips that start, end or run through this date will be listed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
