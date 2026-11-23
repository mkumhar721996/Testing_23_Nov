import type { Order, OrderRepository } from './order.repository';

/**
 * Stand-in until the Postgres adapter exists. Each method decides and writes without
 * awaiting in between, so a cancel and an accept cannot both win.
 */
export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  constructor(orders: Order[] = []) {
    orders.forEach((order) => this.orders.set(order.id, { ...order }));
  }

  async findById(id: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    return order && { ...order };
  }

  async cancelIfPlaced(id: string): Promise<Order | 'not-cancellable' | 'not-found'> {
    const order = this.orders.get(id);
    if (!order) return 'not-found';
    if (order.status !== 'placed') return 'not-cancellable';
    order.status = 'cancelled';
    return { ...order };
  }

  private readonly pending = new Set<string>();

  async recordPendingRefund(id: string): Promise<void> {
    this.pending.add(id);
  }

  pendingRefunds(): string[] {
    return [...this.pending];
  }

  /** The restaurant's accept, here so tests can race it against a cancel. */
  async accept(id: string): Promise<Order | 'not-acceptable' | 'not-found'> {
    const order = this.orders.get(id);
    if (!order) return 'not-found';
    if (order.status !== 'placed') return 'not-acceptable';
    order.status = 'accepted';
    return { ...order };
  }
}
