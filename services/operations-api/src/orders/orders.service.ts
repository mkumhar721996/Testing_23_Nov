import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { canCancel, type OrderStatus } from './order-status';
import { ORDER_REPOSITORY, type Order, type OrderItem, type OrderRepository } from './order.repository';
import { REFUND_GATEWAY, type RefundGateway } from './refund.gateway';

export interface OrderDto {
  id: string;
  status: OrderStatus;
  canCancel: boolean;
  restaurant: string;
  placedAt: string;
  items: OrderItem[];
  total: number;
  currency: string;
}

const toDto = (order: Order): OrderDto => ({
  id: order.id,
  status: order.status,
  canCancel: canCancel(order.status),
  restaurant: order.restaurant,
  placedAt: order.placedAt,
  items: order.items,
  total: order.total,
  currency: order.currency,
});

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(REFUND_GATEWAY) private readonly refunds: RefundGateway,
  ) {}

  async get(orderId: string, customerId: string): Promise<OrderDto> {
    return toDto(await this.ownOrder(orderId, customerId));
  }

  async cancel(orderId: string, customerId: string): Promise<OrderDto> {
    await this.ownOrder(orderId, customerId);
    const result = await this.orders.cancelIfPlaced(orderId);
    if (result === 'not-found') throw new NotFoundException();
    if (result === 'not-cancellable') {
      const current = await this.orders.findById(orderId);
      throw new ConflictException({ code: 'ORDER_NOT_CANCELLABLE', status: current?.status });
    }
    this.logger.log(`order ${result.id} cancelled by customer ${customerId}`);
    try {
      await this.refunds.refundFull(result.id);
    } catch (err) {
      // The cancel is already committed; keep it and queue the refund instead of failing the call.
      this.logger.error(
        `refund failed for cancelled order ${result.id} (customer ${customerId}); recorded as pending`,
        err instanceof Error ? err.stack : String(err),
      );
      await this.orders.recordPendingRefund(result.id);
    }
    return toDto(result);
  }

  private async ownOrder(orderId: string, customerId: string): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new NotFoundException();
    // Same answer as an unknown id, so ids cannot be probed for existence.
    if (order.customerId !== customerId) throw new NotFoundException();
    return order;
  }
}
