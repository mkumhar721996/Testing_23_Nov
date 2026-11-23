import type { MenuItem } from '../api/restaurants';
import { formatCents } from '../lib/money';

export function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <li className="menu-item" data-unavailable={!item.isAvailable}>
      <div>
        <div className="menu-item-name">{item.name}</div>
        {item.description && <div className="text-sm text-muted">{item.description}</div>}
        {!item.isAvailable && <span className="badge badge-warning">Unavailable</span>}
      </div>
      <div className="menu-item-price">{formatCents(item.priceCents)}</div>
    </li>
  );
}
