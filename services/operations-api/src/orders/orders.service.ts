import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ORDER_STEPS, nextStep, stepLabel, type Fulfilment, type OrderStep } from './order-status';
import { OrdersRepository, type Order } from './orders.repository';

export type OrderStatusView = {
  id: string;
  restaurantName: string;
  placedAt: string;
  fulfilment: Fulfilment;
  status: OrderStep;
  steps: { key: OrderStep; label: string }[];
};

function toView(order: Order): OrderStatusView {
  return {
    id: order.id,
    restaurantName: order.restaurantName,
    placedAt: order.placedAt.toISOString(),
    fulfilment: order.fulfilment,
    status: order.status,
    steps: ORDER_STEPS.map((key) => ({ key, label: stepLabel(key, order.fulfilment) })),
  };
}

// Moving an order only updates its stored step: nothing is sent to the customer (ADR-0004).
@Injectable()
export class OrdersService {
  constructor(@Inject(OrdersRepository) private readonly orders: OrdersRepository) {}

  async getForCustomer(customerId: string, orderId: string): Promise<OrderStatusView> {
    const order = await this.orders.findByIdForCustomer(customerId, orderId);
    if (!order) throw new NotFoundException('Order not found');
    return toView(order);
  }

  async listForCustomer(customerId: string): Promise<OrderStatusView[]> {
    return (await this.orders.listForCustomer(customerId)).map(toView);
  }

  async advanceStatus(orderId: string): Promise<OrderStatusView> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const next = nextStep(order.status);
    if (!next) throw new ConflictException('Order is already completed');
    const updated = await this.orders.updateStatus(orderId, next);
    if (!updated) throw new NotFoundException('Order not found');
    return toView(updated);
  }
}
