import { Logger, Module } from '@nestjs/common';
import { InMemoryOrderRepository } from './in-memory-order.repository';
import { ORDER_REPOSITORY } from './order.repository';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { REFUND_GATEWAY, type RefundGateway } from './refund.gateway';

// Placeholders until the Postgres adapter and Cart & checkout's payment refund exist.
const loggingRefundGateway: RefundGateway = {
  async refundFull(orderId) {
    new Logger('RefundGateway').warn(`no payment refund configured; order ${orderId} not refunded`);
  },
};

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDER_REPOSITORY, useValue: new InMemoryOrderRepository() },
    { provide: REFUND_GATEWAY, useValue: loggingRefundGateway },
  ],
})
export class OrdersModule {}
