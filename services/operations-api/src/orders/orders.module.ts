import { Module } from '@nestjs/common';
import { CART_PORT } from './cart.port';
import { OrdersController } from './orders.controller';
import { ORDERS_REPOSITORY } from './orders.repository';
import { OrdersService } from './orders.service';
import { unavailableCart, unavailableOrdersRepository } from './unavailable-adapters';

// The real OrdersRepository and CartPort adapters belong to the order placement and
// Cart & checkout stories; they replace these two providers when they land.
@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDERS_REPOSITORY, useValue: unavailableOrdersRepository },
    { provide: CART_PORT, useValue: unavailableCart },
  ],
})
export class OrdersModule {}
