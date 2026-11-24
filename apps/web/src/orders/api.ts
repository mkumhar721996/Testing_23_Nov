import type { OrderLists } from './types';

const baseUrl = import.meta.env.VITE_OPERATIONS_API_URL ?? '';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) throw new Error(`Operations API answered ${res.status}`);
  return (await res.json()) as T;
}

export const fetchOrders = (): Promise<OrderLists> => call<OrderLists>('/orders');

export const reorder = (orderId: string): Promise<{ cartId: string }> =>
  call<{ cartId: string }>(`/orders/${encodeURIComponent(orderId)}/reorder`, { method: 'POST' });
