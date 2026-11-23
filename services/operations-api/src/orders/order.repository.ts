import type { OrderStatus } from './order-status';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurant: string;
  placedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  currency: string;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  findById(id: string): Promise<Order | undefined>;
  /**
   * Moves the order to cancelled only if it is still placed, as one atomic conditional
   * write (`UPDATE orders SET status='cancelled' WHERE id=$1 AND status='placed'`), so a
   * concurrent accept by the restaurant and this cancel cannot both win.
   */
  /** Records that a cancelled order's refund failed, so it is retried rather than lost. */
  recordPendingRefund(id: string): Promise<void>;
  cancelIfPlaced(id: string): Promise<Order | 'not-cancellable' | 'not-found'>;
}
