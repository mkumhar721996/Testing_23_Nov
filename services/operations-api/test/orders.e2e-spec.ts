import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { CART_PORT } from '../src/orders/cart.port';
import { ORDERS_REPOSITORY, type OrderDetail } from '../src/orders/orders.repository';

const base = {
  restaurantId: 'r1',
  restaurantName: 'Harbor Noodle House',
  placedAt: '2026-11-21T12:00:00.000Z',
  itemCount: 2,
  totalMinor: 1950,
  currency: 'GBP',
};
const stored: (OrderDetail & { customerId: string })[] = [
  {
    ...base,
    id: 'o1',
    customerId: 'c1',
    status: 'completed',
    items: [
      { menuItemId: 'm1', name: 'Beef pho', quantity: 1 },
      { menuItemId: 'm2', name: 'Spring rolls', quantity: 2 },
    ],
  },
  { ...base, id: 'o2', customerId: 'c1', status: 'placed', items: [] },
];

const carts = new Map<string, { menuItemId: string; quantity: number }[]>([
  ['c1', [{ menuItemId: 'm9', quantity: 1 }]],
]);
const cartItems = (customerId: string) => carts.get(customerId) ?? [];

describe('orders HTTP contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ORDERS_REPOSITORY)
      .useValue({
        listForCustomer: async (c: string) => stored.filter((o) => o.customerId === c),
        findForCustomer: async (c: string, id: string) =>
          stored.find((o) => o.customerId === c && o.id === id) ?? null,
      })
      .overrideProvider(CART_PORT)
      .useValue({
        addItems: async (c: string, items: { menuItemId: string; quantity: number }[]) => {
          carts.set(c, [...cartItems(c), ...items]);
          return { cartId: `cart-${c}` };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    // Stands in for the Entra ID guard, which is not built yet.
    app.use((req: Request & { user?: { customerId: string } }, _res: Response, next: NextFunction) => {
      const customerId = req.header('x-test-customer');
      if (customerId) req.user = { customerId };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps the existing cart item and adds the reordered ones', async () => {
    await request(app.getHttpServer())
      .post('/orders/o1/reorder')
      .set('x-test-customer', 'c1')
      .expect(200, { cartId: 'cart-c1', addedItemCount: 2 });
    expect(cartItems('c1').map((i) => i.menuItemId).sort()).toEqual(['m1', 'm2', 'm9']);
  });

  it('answers 409 for an order that is not finished', async () => {
    await request(app.getHttpServer())
      .post('/orders/o2/reorder')
      .set('x-test-customer', 'c1')
      .expect(409);
  });

  it("answers 404 for another customer's order", async () => {
    await request(app.getHttpServer())
      .post('/orders/o1/reorder')
      .set('x-test-customer', 'c2')
      .expect(404);
  });

  it('lists the signed-in customer orders split into active and past', async () => {
    const res = await request(app.getHttpServer())
      .get('/orders')
      .set('x-test-customer', 'c1')
      .expect(200);
    expect(res.body.active.map((o: { id: string }) => o.id)).toEqual(['o2']);
    expect(res.body.past.map((o: { id: string }) => o.id)).toEqual(['o1']);
  });

  it('answers 401 without a signed-in customer', async () => {
    await request(app.getHttpServer()).get('/orders').expect(401);
    await request(app.getHttpServer()).post('/orders/o1/reorder').expect(401);
  });
});
