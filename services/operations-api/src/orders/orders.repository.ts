import type { Fulfilment, OrderStep } from './order-status';

export type Order = {
  id: string;
  customerId: string;
  restaurantName: string;
  fulfilment: Fulfilment;
  status: OrderStep;
  placedAt: Date;
};

export abstract class OrdersRepository {
  abstract findByIdForCustomer(customerId: string, orderId: string): Promise<Order | null>;
  abstract listForCustomer(customerId: string): Promise<Order[]>;
  abstract findById(orderId: string): Promise<Order | null>;
  abstract updateStatus(orderId: string, status: OrderStep): Promise<Order | null>;
}
