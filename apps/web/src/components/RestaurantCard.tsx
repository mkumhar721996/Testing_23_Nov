import { Link } from 'react-router';
import type { RestaurantSummary } from '../api/restaurants';
import { formatCents } from '../lib/money';
import { Icon } from './Icon';

export function RestaurantCard({ restaurant: r }: { restaurant: RestaurantSummary }) {
  return (
    <li>
      <Link className="card rest-card" to={`/restaurants/${r.id}`} data-closed={!r.isOpen}>
        <div className="cluster-between">
          <h2>{r.name}</h2>
          {r.isOpen ? (
            <span className="badge badge-success">Open</span>
          ) : (
            <span className="badge badge-danger">Closed</span>
          )}
        </div>
        <p className="text-muted">{r.cuisine}</p>
        <div className="rest-meta text-sm text-muted">
          <span>
            <Icon name="clock" />
            {r.hoursLabel}
          </span>
        </div>
        <div className="rest-meta text-sm text-muted">
          <span>
            <Icon name="tag" />
            {`Delivery ${formatCents(r.deliveryFeeCents)}, ${r.etaLabel}`}
          </span>
        </div>
      </Link>
    </li>
  );
}
