export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export function canCancel(status: OrderStatus): boolean {
  return status === 'placed';
}
