export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export const FINISHED_STATUSES: readonly OrderStatus[] = ['completed', 'rejected', 'cancelled'];

// Anything not finished is active, so a later non-terminal step lands on the active list.
export const isFinished = (status: OrderStatus): boolean => FINISHED_STATUSES.includes(status);
