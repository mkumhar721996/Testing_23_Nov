import {
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { OrdersService, type OrderDto } from './orders.service';

// Stand-in for the signed-in customer until Entra ID sign-in (ADR-0005) provides one.
const customerIdOf = (header: string | undefined): string => {
  if (!header) throw new UnauthorizedException();
  return header;
};

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get(':id')
  get(@Param('id') id: string, @Headers('x-customer-id') customer?: string): Promise<OrderDto> {
    return this.orders.get(id, customerIdOf(customer));
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Headers('x-customer-id') customer?: string): Promise<OrderDto> {
    return this.orders.cancel(id, customerIdOf(customer));
  }
}
