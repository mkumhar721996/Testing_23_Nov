import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Order, OrdersRepository } from './orders.repository';
import type { Fulfilment, OrderStep } from './order-status';

type OrderRow = {
  id: string;
  customer_id: string;
  restaurant_name: string;
  fulfilment: Fulfilment;
  status: OrderStep;
  placed_at: Date;
};

const COLUMNS = 'id, customer_id, restaurant_name, fulfilment, status, placed_at';

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    restaurantName: row.restaurant_name,
    fulfilment: row.fulfilment,
    status: row.status,
    placedAt: row.placed_at,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PgOrdersRepository extends OrdersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    super();
  }

  async findById(orderId: string): Promise<Order | null> {
    if (!UUID.test(orderId)) return null;
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${COLUMNS} FROM orders WHERE id = $1`,
      [orderId],
    );
    return rows[0] ? toOrder(rows[0]) : null;
  }

  async findByIdForCustomer(customerId: string, orderId: string): Promise<Order | null> {
    if (!UUID.test(orderId)) return null;
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${COLUMNS} FROM orders WHERE id = $1 AND customer_id = $2`,
      [orderId, customerId],
    );
    return rows[0] ? toOrder(rows[0]) : null;
  }

  async listForCustomer(customerId: string): Promise<Order[]> {
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${COLUMNS} FROM orders WHERE customer_id = $1 ORDER BY placed_at DESC`,
      [customerId],
    );
    return rows.map(toOrder);
  }

  async updateStatus(orderId: string, status: OrderStep): Promise<Order | null> {
    const { rows } = await this.pool.query<OrderRow>(
      `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`,
      [orderId, status],
    );
    return rows[0] ? toOrder(rows[0]) : null;
  }
}
