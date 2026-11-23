import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { PgOrdersRepository } from './pg-orders.repository';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, { provide: OrdersRepository, useClass: PgOrdersRepository }],
  exports: [OrdersService],
})
export class OrdersModule {}
