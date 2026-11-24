import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CART_PORT, type CartPort } from './cart.port';
import { isFinished } from './order-status';
import {
  ORDERS_REPOSITORY,
  type OrderSummary,
  type OrdersRepository,
} from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY) private readonly orders: OrdersRepository,
    @Inject(CART_PORT) private readonly cart: CartPort,
  ) {}

  async list(customerId: string): Promise<{ active: OrderSummary[]; past: OrderSummary[] }> {
    const all = await this.orders.listForCustomer(customerId);
    const newestFirst = [...all]
      .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))
      .map(({ id, restaurantId, restaurantName, status, placedAt, itemCount, totalMinor, currency }) => ({
        id,
        restaurantId,
        restaurantName,
        status,
        placedAt,
        itemCount,
        totalMinor,
        currency,
      }));
    return {
      active: newestFirst.filter((o) => !isFinished(o.status)),
      past: newestFirst.filter((o) => isFinished(o.status)),
    };
  }

  async reorder(
    customerId: string,
    orderId: string,
  ): Promise<{ cartId: string; addedItemCount: number }> {
    const order = await this.orders.findForCustomer(customerId, orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (!isFinished(order.status)) {
      throw new ConflictException('Only a finished order can be reordered');
    }
    const items = order.items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity }));
    const { cartId } = await this.cart.addItems(customerId, items);
    return { cartId, addedItemCount: items.length };
  }
}
