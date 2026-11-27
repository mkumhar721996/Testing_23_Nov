import { formatAxisAmount, linePoints, PLOT_AREA } from './chart-geometry';
import PeriodFilter from './PeriodFilter';
import type { Period, RevenueSeries } from './types';
import { useRevenue } from './useRevenue';

const VIEW = { width: 380, height: 160 };
const PLOT_BOTTOM = VIEW.height - PLOT_AREA.bottom;
const X_LABEL_Y = VIEW.height - 8;

const UNIT: Record<Period, string> = { weekly: 'day', monthly: 'month', yearly: 'year' };
const WEEKDAYS: Record<string, string> = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

function describe(series: RevenueSeries, peakIndex: number): string {
  const { points, period } = series;
  const first = points[0];
  const last = points[points.length - 1];
  const peak = points[peakIndex];
  const peakText = `Peak of ${formatAxisAmount(peak.amountMinor)} on ${period === 'weekly' ? (WEEKDAYS[peak.label] ?? peak.label) : peak.label}.`;
  return `Line chart: revenue by ${UNIT[period]}, ${first.label} to ${last.label}. ${peakText}`;
}

function LineChart({ series }: { series: RevenueSeries }) {
  const { points: plotted, max } = linePoints(series.points, VIEW.width, VIEW.height);
  const amounts = series.points.map((p) => p.amountMinor);
  const peakIndex = amounts.indexOf(Math.max(...amounts));
  const lineEnd = VIEW.width - PLOT_AREA.right;
  const rows = [
    { y: PLOT_BOTTOM, value: 0 },
    { y: (PLOT_BOTTOM + PLOT_AREA.top) / 2, value: max / 2 },
    { y: PLOT_AREA.top, value: max },
  ];
  const showLabel = (i: number) => series.points.length <= 7 || i % 3 === 0 || i === series.points.length - 1;
  const peak = plotted[peakIndex];

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      role="img"
      aria-label={describe(series, peakIndex)}
    >
      {rows.map((row) => (
        <line key={row.y} className="grid-line" x1={PLOT_AREA.left} y1={row.y} x2={lineEnd} y2={row.y} />
      ))}
      {rows.map((row) => (
        <text key={row.y} className="axis-text" x={PLOT_AREA.left - 6} y={row.y + 4} textAnchor="end">
          {formatAxisAmount(row.value)}
        </text>
      ))}
      <polyline className="series" points={plotted.map((p) => `${p.x},${p.y}`).join(' ')} />
      {plotted.map((p, i) => (
        <circle key={series.points[i].label} className="point" cx={p.x} cy={p.y} r={i === peakIndex ? 4 : 3} />
      ))}
      <text
        className="peak-text"
        x={peak.x}
        y={peak.y - 10}
        textAnchor={peak.x > lineEnd - 30 ? 'end' : 'middle'}
      >
        {formatAxisAmount(series.points[peakIndex].amountMinor)}
      </text>
      {plotted.map(
        (p, i) =>
          showLabel(i) && (
            <text key={series.points[i].label} className="axis-text" x={p.x} y={X_LABEL_Y} textAnchor="middle">
              {series.points[i].label}
            </text>
          ),
      )}
    </svg>
  );
}

export default function RevenueOverview() {
  const { period, setPeriod, status, data, retry } = useRevenue();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Revenue overview</h2>
        <PeriodFilter label="Revenue period" value={period} onChange={setPeriod} />
      </div>
      {status === 'loading' && (
        <div aria-busy="true">
          <div className="chart-skel skeleton" />
        </div>
      )}
      {status === 'error' && (
        <div className="alert alert-danger widget-state" role="alert">
          <div>
            <strong>We couldn't load revenue.</strong>
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
          <h3 style={{ margin: 0 }}>No revenue in this period</h3>
          <p style={{ margin: 0 }}>
            Revenue appears here once bookings are paid. Choose another period from the menu.
          </p>
        </div>
      )}
      {status === 'ready' && data && <LineChart series={data} />}
    </div>
  );
}
