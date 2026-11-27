import { useMonthlySpending } from './useMonthlySpending';
import type { MonthlySpendingResponse } from './spending-types';

// SVG geometry in viewBox units, as drawn in the approved design.
const LABEL_WIDTH = 120;
const PLOT_WIDTH = 280;
const ROW_STEP = 40;
const BAR_TOP = 18;
const BAR_HEIGHT = 26;
const BAR_RADIUS = 4;
const VIEW_WIDTH = 480;
const VIZ_COLOURS = 6;
const UNCATEGORISED = 'Uncategorised';

const categoryLabel = (category: string | null) => category ?? UNCATEGORISED;

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthNumber - 1, 1)),
  );
}

/** A 1, 2 or 5 step (in major units) that gives roughly three grid lines up to `max`. */
function gridStep(maxMajor: number): number {
  const rough = maxMajor / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude;
  return Math.max(step, 1);
}

function Chart({ data }: { data: MonthlySpendingResponse }) {
  const money = (minor: number, whole: boolean) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: data.currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(minor / 100);
  const title = `Spending by category, ${monthLabel(data.month)}`;
  const max = Math.max(...data.categories.map((c) => c.totalMinor));
  const axisBottom = ROW_STEP * data.categories.length + 10;
  const stepMinor = gridStep(max / 100) * 100;
  const ticks = Array.from({ length: Math.floor(max / stepMinor) + 1 }, (_, i) => i * stepMinor);
  const x = (minor: number) => LABEL_WIDTH + (minor / max) * PLOT_WIDTH;
  const description = `Bar chart: ${data.categories
    .map((c) => `${categoryLabel(c.category)} ${money(c.totalMinor, true)}`)
    .join(', ')}.`;

  return (
    <>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${axisBottom + 30}`}
        role="img"
        aria-labelledby="spending-svg-title spending-svg-desc"
      >
        <title id="spending-svg-title">{title}</title>
        <desc id="spending-svg-desc">{description}</desc>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid-line" x1={x(tick)} y1={8} x2={x(tick)} y2={axisBottom} />
            <text x={x(tick)} y={axisBottom + 20} textAnchor="middle">
              {money(tick, true)}
            </text>
          </g>
        ))}
        {data.categories.map((c, i) => {
          const top = BAR_TOP + ROW_STEP * i;
          const width = (c.totalMinor / max) * PLOT_WIDTH;
          return (
            <g key={c.category ?? UNCATEGORISED} data-testid="spending-bar">
              <text x={0} y={top + 18}>
                {categoryLabel(c.category)}
              </text>
              <rect
                x={LABEL_WIDTH}
                y={top}
                width={width}
                height={BAR_HEIGHT}
                rx={BAR_RADIUS}
                fill={`var(--color-viz-${(i % VIZ_COLOURS) + 1})`}
              />
              <text className="val" x={LABEL_WIDTH + width + 8} y={top + 18}>
                {money(c.totalMinor, true)}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="chart-table">
        <caption>Same figures as text</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Spent this month</th>
          </tr>
        </thead>
        <tbody>
          {data.categories.map((c) => (
            <tr key={c.category ?? UNCATEGORISED}>
              <td>{categoryLabel(c.category)}</td>
              <td>{money(c.totalMinor, false)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function SpendingChart() {
  const { state, retry } = useMonthlySpending();

  if (state.status === 'loading') {
    return (
      <section className="card chart-wrap" aria-label="Loading spending by category" aria-busy="true">
        <div className="dash-skel">
          <span className="skeleton dash-skel-title" />
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="alert alert-danger" role="alert">
        <svg className="icon" aria-hidden="true">
          <use href="#i-flag" />
        </svg>
        <div className="stack-sm dash-alert-text">
          <strong>We couldn't load your spending</strong>
          <span>Your money is safe. Check your connection and try again.</span>
        </div>
        <button className="btn btn-secondary" type="button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  const { data } = state;
  const hasSpending = data.categories.length > 0;
  return (
    <section className="card chart-wrap stack" aria-labelledby="spending-heading">
      <h2 className="section-title" id="spending-heading">
        {`Spending by category, ${monthLabel(data.month)}`}
      </h2>
      {hasSpending ? (
        <>
          <p className="text-muted">
            {`Card and account purchases this month, ${new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: data.currency,
              maximumFractionDigits: 0,
            }).format(data.totalMinor / 100)} in total. Transfers, loan repayments and deposits are not counted.`}
          </p>
          <Chart data={data} />
        </>
      ) : (
        <div className="dash-inline-empty">
          <strong>No spending this month</strong>
          Card and account purchases will appear here as they post.
        </div>
      )}
    </section>
  );
}
