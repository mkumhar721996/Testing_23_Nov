import { DONUT, donutSegments } from './chart-geometry';
import { formatCount } from './format';
import PeriodFilter from './PeriodFilter';
import { useTopDestinations } from './useTopDestinations';

export default function TopDestinationsCard() {
  const { period, setPeriod, status, data, retry } = useTopDestinations();
  const destinations = data?.destinations ?? [];
  const segments = donutSegments(destinations);
  const summary = destinations.map((d) => `${d.name} ${d.percent}%`).join(', ');

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Top destinations</h2>
        <PeriodFilter label="Destinations period" value={period} onChange={setPeriod} />
      </div>
      {status === 'loading' && (
        <div aria-busy="true">
          <div className="chart-skel skeleton" />
        </div>
      )}
      {status === 'error' && (
        <div className="alert alert-danger widget-state" role="alert">
          <div>
            <strong>We couldn't load destinations.</strong>
            <p className="hint" style={{ color: 'inherit' }}>
              The Operations API didn't respond. Your data is safe — try again in a moment.
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {status === 'empty' && (
        <div className="empty-state">
          <h3 style={{ margin: 0 }}>No trips in this period</h3>
          <p style={{ margin: 0 }}>
            Top destinations appear here once trips are booked. Choose another period from the menu.
          </p>
        </div>
      )}
      {status === 'ready' && (
        <div className="dest">
          <svg viewBox="0 0 120 120" role="img" aria-label={`Donut chart: ${summary}`}>
            <g transform="rotate(-90 60 60)">
              {segments.map((segment, i) => (
                <circle
                  key={destinations[i].name}
                  className={`seg seg-${i + 1}`}
                  cx="60"
                  cy="60"
                  r={DONUT.radius}
                  strokeDasharray={`${segment.dash} ${DONUT.circumference}`}
                  strokeDashoffset={segment.offset}
                />
              ))}
            </g>
          </svg>
          <div className="legend">
            {destinations.map((d, i) => (
              <div className="legend-row" key={d.name}>
                <span className={`sw sw-${i + 1}`} />
                <div>
                  {`${d.name}, ${d.country} (${d.percent}%)`}
                  <small>{formatCount(d.participants)} participants</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
