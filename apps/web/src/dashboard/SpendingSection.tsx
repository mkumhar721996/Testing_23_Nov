import { formatMoney } from './format';

interface Slice {
  category: string;
  amount: number;
}

const MAX_SERIES = 6;

// A sixth series is the limit; beyond it the rest is grouped as "Other".
function groupSlices(items: Slice[]): Slice[] {
  if (items.length <= MAX_SERIES) return items;
  const head = items.slice(0, MAX_SERIES - 1);
  const other = items.slice(MAX_SERIES - 1).reduce((sum, i) => sum + i.amount, 0);
  return [...head, { category: 'Other', amount: other }];
}

export function SpendingSection({ items, currency }: { items: Slice[]; currency: string }) {
  const slices = groupSlices(items);
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const percent = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);
  let offset = 0;
  const arcs = slices.map((s, i) => {
    const length = total > 0 ? (s.amount / total) * 100 : 0;
    const arc = { ...s, length, offset: -offset, color: `var(--color-viz-${i + 1})` };
    offset += length;
    return arc;
  });

  return (
    <section className="card" aria-labelledby="h-spend">
      <div className="card-header">
        <h3 id="h-spend">Spending by category, this month</h3>
      </div>
      <div className="donut-wrap">
        <div className="donut">
          <svg
            viewBox="0 0 42 42"
            role="img"
            aria-label={`Donut chart of this month's spending: ${
              slices.map((s) => `${s.category} ${percent(s.amount)}%`).join(', ') || 'no spending'
            }`}
          >
            {arcs.map((a) => (
              <circle
                key={a.category}
                cx="21"
                cy="21"
                r="15.9155"
                fill="none"
                stroke={a.color}
                strokeWidth="6"
                strokeDasharray={`${a.length} ${100 - a.length}`}
                strokeDashoffset={a.offset}
              />
            ))}
          </svg>
          <div className="donut-centre">
            <strong>{formatMoney(total, currency)}</strong>
            <span className="note">spent</span>
          </div>
        </div>
        <ul className="list legend">
          {arcs.map((a) => (
            <li className="row-item" key={a.category}>
              <span>
                <span className="swatch" style={{ background: a.color }}></span>
                <span>{a.category}</span>
              </span>
              <span className="amt">
                <span>{formatMoney(a.amount, currency)}</span>{' '}
                <span className="note">{percent(a.amount)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
