import { useRef, useState } from 'react';
import DayPanel from './DayPanel';
import { formatMonthTitle, MONTH_NAMES, monthGrid, monthOf, shiftMonth, tripsOn } from './calendar';
import { useMonthTrips } from './useMonthTrips';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Renders the day panel and the calendar card together, because the selected date and the loaded
// trips are shared between them. Place it inside a dashboard column.
export default function MonthCalendar() {
  const [month, setMonth] = useState(() => monthOf(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const { status, trips, retry } = useMonthTrips(month);
  const grid = useRef<HTMLDivElement>(null);

  const title = formatMonthTitle(month);
  const [year, month1] = month.split('-').map(Number);
  const { lead, days, trailing } = monthGrid(year, month1 - 1);
  const outCell = (key: string, n: number) => (
    <span className="day out" aria-hidden="true" key={key}>
      {n}
    </span>
  );
  const prevDays = new Date(year, month1 - 1, 0).getDate();

  function go(delta: -1 | 1) {
    setMonth(shiftMonth(month, delta));
    setSelected(null);
  }

  function closePanel() {
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${selected}"]`)?.focus();
    setSelected(null);
  }

  return (
    <>
      {selected && <DayPanel date={selected} trips={tripsOn(trips, selected)} onClose={closePanel} />}
      <div className="card" aria-busy={status === 'loading'}>
        <div className="cal-head">
          <h2 className="card-title" aria-live="polite">
            {title}
          </h2>
          <div className="cluster" style={{ gap: 'var(--space-1)' }}>
            <button className="btn btn-secondary btn-icon" type="button" aria-label="Previous month" onClick={() => go(-1)}>
              ‹
            </button>
            <button className="btn btn-secondary btn-icon" type="button" aria-label="Next month" onClick={() => go(1)}>
              ›
            </button>
          </div>
        </div>

        {status === 'loading' && (
          <div className="cal-grid" aria-hidden="true">
            {Array.from({ length: 35 }, (_, i) => (
              <span className="skeleton" style={{ height: 'var(--control-height-md)' }} key={i} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="alert alert-danger tile-error" role="alert">
            <div>
              <strong>We couldn't load your trips.</strong>
              <p className="hint" style={{ color: 'inherit' }}>
                The Operations API didn't respond. Try again, or use the arrows to look at another month.
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="cal-grid" role="group" aria-label={`Dates in ${title}`} ref={grid}>
              {WEEKDAYS.map((d) => (
                <span className="dow" key={d}>
                  {d}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => outCell(`lead-${i}`, prevDays - lead + 1 + i))}
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1;
                const iso = `${month}-${String(day).padStart(2, '0')}`;
                const count = tripsOn(trips, iso).length;
                const classes = ['day', count ? 'has-trip' : '', iso === selected ? 'is-selected' : '']
                  .filter(Boolean)
                  .join(' ');
                const name = `${day} ${MONTH_NAMES[month1 - 1]}${count ? `, ${count} ${count > 1 ? 'trips' : 'trip'}` : ''}`;
                return (
                  <button
                    type="button"
                    className={classes}
                    data-date={iso}
                    aria-label={name}
                    aria-pressed={iso === selected ? true : undefined}
                    onClick={() => setSelected(iso)}
                    key={iso}
                  >
                    {day}
                  </button>
                );
              })}
              {Array.from({ length: trailing }, (_, i) => outCell(`trail-${i}`, i + 1))}
            </div>
            <div aria-live="polite">
              {trips.length === 0 && (
                <div className="cal-note">
                  <strong>No trips this month</strong>
                  <span className="hint">Use the arrows to look at another month.</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
