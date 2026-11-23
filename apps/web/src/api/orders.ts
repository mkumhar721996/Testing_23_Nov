import type { OrderStatusView } from '../orders/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class OrderNotFoundError extends Error {
  constructor() {
    super('Order not found');
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { signal, headers: { Accept: 'application/json' } });
  if (res.status === 404) throw new OrderNotFoundError();
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return (await res.json()) as T;
}

export function fetchOrder(id: string, signal?: AbortSignal): Promise<OrderStatusView> {
  return getJson<OrderStatusView>(`/orders/${encodeURIComponent(id)}`, signal);
}

export function fetchOrders(signal?: AbortSignal): Promise<OrderStatusView[]> {
  return getJson<OrderStatusView[]>('/orders', signal);
}
