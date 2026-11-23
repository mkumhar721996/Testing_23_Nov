export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface Order {
  id: string;
  status: OrderStatus;
  canCancel: boolean;
  restaurant: string;
  placedAt: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  currency: string;
}

export type CancelResult = { kind: 'cancelled' } | { kind: 'not-cancellable'; status: OrderStatus };

const baseUrl = import.meta.env.VITE_API_URL ?? '';
// Stand-in for the signed-in customer until Entra ID sign-in (ADR-0005) is wired.
const headers = { 'x-customer-id': import.meta.env.VITE_CUSTOMER_ID ?? '' };

export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${baseUrl}/orders/${encodeURIComponent(id)}`, { headers });
  if (!res.ok) throw new Error(`Loading order ${id} failed with ${res.status}`);
  return res.json();
}

export async function cancelOrder(id: string): Promise<CancelResult> {
  const res = await fetch(`${baseUrl}/orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers,
  });
  if (res.status === 409) {
    const body = await res.json();
    return { kind: 'not-cancellable', status: body.status };
  }
  if (!res.ok) throw new Error(`Cancelling order ${id} failed with ${res.status}`);
  return { kind: 'cancelled' };
}
