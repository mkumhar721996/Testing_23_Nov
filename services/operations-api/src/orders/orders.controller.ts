import { Controller, Get, Inject, Param } from '@nestjs/common';
import { CurrentCustomer } from './current-customer.decorator';
import { OrdersService, type OrderStatusView } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentCustomer() customerId: string): Promise<OrderStatusView[]> {
    return this.orders.listForCustomer(customerId);
  }

  @Get(':id')
  get(@CurrentCustomer() customerId: string, @Param('id') id: string): Promise<OrderStatusView> {
    return this.orders.getForCustomer(customerId, id);
  }
}
