import { Controller, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { CurrentCustomer } from './current-customer.decorator';
import type { OrderSummary } from './orders.repository';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get()
  list(
    @CurrentCustomer() customerId: string,
  ): Promise<{ active: OrderSummary[]; past: OrderSummary[] }> {
    return this.orders.list(customerId);
  }

  @Post(':orderId/reorder')
  @HttpCode(200)
  reorder(
    @CurrentCustomer() customerId: string,
    @Param('orderId') orderId: string,
  ): Promise<{ cartId: string; addedItemCount: number }> {
    return this.orders.reorder(customerId, orderId);
  }
}
