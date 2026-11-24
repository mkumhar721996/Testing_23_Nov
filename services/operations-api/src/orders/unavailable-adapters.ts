import { ServiceUnavailableException } from '@nestjs/common';
import type { CartPort } from './cart.port';
import type { OrdersRepository } from './orders.repository';

// Placeholders until the order placement and Cart & checkout stories provide the real adapters
// (the orders tables and the cart store do not exist yet). They answer 503 instead of faking data.
const unavailable = (): never => {
  throw new ServiceUnavailableException('Orders are not available yet');
};

export const unavailableOrdersRepository: OrdersRepository = {
  listForCustomer: async () => unavailable(),
  findForCustomer: async () => unavailable(),
};

export const unavailableCart: CartPort = {
  addItems: async () => unavailable(),
};
