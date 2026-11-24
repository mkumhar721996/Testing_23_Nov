import type { OrderStatus } from './order-status';

export interface OrderSummary {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  placedAt: string;
  itemCount: number;
  totalMinor: number;
  currency: string;
}

export interface OrderDetail extends OrderSummary {
  items: { menuItemId: string; name: string; quantity: number }[];
}

// Port: the PostgreSQL adapter reads the orders tables owned by order placement (ADR-0003).
export interface OrdersRepository {
  listForCustomer(customerId: string): Promise<OrderSummary[]>;
  findForCustomer(customerId: string, orderId: string): Promise<OrderDetail | null>;
}

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');
