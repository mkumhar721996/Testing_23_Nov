import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { InMemoryOrderRepository } from '../src/orders/in-memory-order.repository';
import { ORDER_REPOSITORY, type Order } from '../src/orders/order.repository';
import { REFUND_GATEWAY } from '../src/orders/refund.gateway';

const order = (id: string, status: Order['status']): Order => ({
  id,
  customerId: 'c1',
  restaurant: 'Harbor Noodle House',
  placedAt: '2026-11-23T12:14:00Z',
  status,
  items: [{ name: 'Beef pho', quantity: 1, price: 12.5 }],
  total: 12.5,
  currency: 'GBP',
});

describe('POST /orders/:id/cancel', () => {
  let app: INestApplication;
  let repo: InMemoryOrderRepository;
  const refunds = { refundFull: vi.fn() };

  beforeAll(async () => {
    repo = new InMemoryOrderRepository([
      order('4821', 'placed'),
      order('4822', 'accepted'),
      order('4823', 'rejected'),
      order('4824', 'placed'),
    ]);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ORDER_REPOSITORY)
      .useValue(repo)
      .overrideProvider(REFUND_GATEWAY)
      .useValue(refunds)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    refunds.refundFull.mockReset().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('shows a placed order as cancellable', async () => {
    const res = await request(server()).get('/orders/4824').set('x-customer-id', 'c1').expect(200);
    expect(res.body).toMatchObject({ status: 'placed', canCancel: true });
  });

  it('cancels a placed order and refunds the full amount once', async () => {
    await request(server()).post('/orders/4821/cancel').set('x-customer-id', 'c1').expect(201);
    const res = await request(server()).get('/orders/4821').set('x-customer-id', 'c1').expect(200);
    expect(res.body).toMatchObject({ status: 'cancelled', canCancel: false });
    expect(refunds.refundFull).toHaveBeenCalledExactlyOnceWith('4821');
  });

  it.each([
    ['4822', 'accepted'],
    ['4823', 'rejected'],
  ])('answers 409 for order %s (%s) and changes nothing', async (id, status) => {
    const res = await request(server())
      .post(`/orders/${id}/cancel`)
      .set('x-customer-id', 'c1')
      .expect(409);
    expect(res.body).toMatchObject({ code: 'ORDER_NOT_CANCELLABLE', status });
    expect(refunds.refundFull).not.toHaveBeenCalled();
    expect((await repo.findById(id))?.status).toBe(status);
  });

  it("does not let another customer cancel an order", async () => {
    await request(server()).post('/orders/4824/cancel').set('x-customer-id', 'c2').expect(403);
    expect(refunds.refundFull).not.toHaveBeenCalled();
    expect((await repo.findById('4824'))?.status).toBe('placed');
  });

  it('rejects a request with no customer', async () => {
    await request(server()).post('/orders/4824/cancel').expect(401);
  });
});
