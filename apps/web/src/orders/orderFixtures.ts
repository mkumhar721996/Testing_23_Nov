import type { Fulfilment, OrderStatusView, OrderStep } from './types';

const KEYS: OrderStep[] = ['placed', 'accepted', 'preparing', 'ready', 'completed'];
const LABELS = ['Placed', 'Accepted', 'Preparing', 'Ready', 'Completed'];

// Test helper: builds an order the way the Operations API returns it.
export function makeOrder(
  id: string,
  status: OrderStep = 'placed',
  fulfilment: Fulfilment = 'pickup',
  restaurantName = 'Harbor Noodle House',
): OrderStatusView {
  return {
    id,
    restaurantName,
    placedAt: '2026-11-23T12:14:00.000Z',
    fulfilment,
    status,
    steps: KEYS.map((key, i) => ({
      key,
      label: key === 'ready' && fulfilment === 'delivery' ? 'Out for delivery' : LABELS[i],
    })),
  };
}
