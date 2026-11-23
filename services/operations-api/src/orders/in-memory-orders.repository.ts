import { Order, OrdersRepository } from './orders.repository';
import type { OrderStep } from './order-status';

export class InMemoryOrdersRepository extends OrdersRepository {
  private readonly orders = new Map<string, Order>();

  seed(order: Order): void {
    this.orders.set(order.id, { ...order });
  }

  async findById(orderId: string): Promise<Order | null> {
    const order = this.orders.get(orderId);
    return order ? { ...order } : null;
  }

  async findByIdForCustomer(customerId: string, orderId: string): Promise<Order | null> {
    const order = await this.findById(orderId);
    return order && order.customerId === customerId ? order : null;
  }

  async listForCustomer(customerId: string): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())
      .map((o) => ({ ...o }));
  }

  async updateStatus(orderId: string, status: OrderStep): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order) return null;
    order.status = status;
    return { ...order };
  }
}
