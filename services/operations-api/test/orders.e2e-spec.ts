import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryOrdersRepository } from '../src/orders/in-memory-orders.repository';
import { ORDER_STEPS } from '../src/orders/order-status';
import { OrdersController } from '../src/orders/orders.controller';
import { OrdersRepository } from '../src/orders/orders.repository';
import { OrdersService } from '../src/orders/orders.service';

describe('orders', () => {
  let app: INestApplication;
  const repo = new InMemoryOrdersRepository();
  let service: OrdersService;

  beforeAll(async () => {
    ORDER_STEPS.forEach((status, i) =>
      repo.seed({
        id: `o-${status}`,
        customerId: 'c1',
        restaurantName: 'Harbor Noodle House',
        fulfilment: i % 2 ? 'delivery' : 'pickup',
        status,
        placedAt: new Date('2026-11-23T12:14:00Z'),
      }),
    );
    repo.seed({
      id: 'other',
      customerId: 'c2',
      restaurantName: 'Pizza Lane',
      fulfilment: 'pickup',
      status: 'placed',
      placedAt: new Date(),
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [OrdersService, { provide: OrdersRepository, useValue: repo }],
    }).compile();
    app = moduleRef.createNestApplication();
    // Stand-in for the authentication middleware that sets the customer id.
    app.use((req: { customerId?: string; headers: Record<string, string> }, _res: unknown, next: () => void) => {
      req.customerId = req.headers['x-test-customer'];
      next();
    });
    await app.init();
    service = moduleRef.get(OrdersService);
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string, customer = 'c1') =>
    request(app.getHttpServer()).get(path).set('x-test-customer', customer);

  it.each(ORDER_STEPS)('returns the stored step %s', async (status) => {
    const res = await get(`/orders/o-${status}`).expect(200);
    expect(res.body.status).toBe(status);
    expect(res.body.steps).toHaveLength(5);
  });

  it('returns 404 for another customer order', async () => {
    await get('/orders/other').expect(404);
  });

  it('returns 401 when no customer is set', async () => {
    await request(app.getHttpServer()).get('/orders/o-placed').expect(401);
  });

  it('lists only the customer orders', async () => {
    const res = await get('/orders').expect(200);
    expect(res.body).toHaveLength(5);
  });

  it('shows the next step after staff advance the order', async () => {
    await service.advanceStatus('o-placed');
    const res = await get('/orders/o-placed').expect(200);
    expect(res.body.status).toBe('accepted');
  });
});
