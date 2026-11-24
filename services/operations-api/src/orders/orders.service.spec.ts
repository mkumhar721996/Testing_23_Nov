import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { CartPort } from './cart.port';
import type { OrderDetail, OrderSummary, OrdersRepository } from './orders.repository';
import type { OrderStatus } from './order-status';
import { OrdersService } from './orders.service';

const order = (o: Partial<OrderSummary> & { id: string }): OrderSummary => ({
  restaurantId: 'r1',
  restaurantName: 'Harbor Noodle House',
  status: 'placed',
  placedAt: '2026-11-21T12:00:00.000Z',
  itemCount: 1,
  totalMinor: 1950,
  currency: 'GBP',
  ...o,
});

const orderDetail = (o: Partial<OrderDetail> & { id: string }): OrderDetail => ({
  ...order(o),
  items: [{ menuItemId: 'm1', name: 'Beef pho', quantity: 1 }],
  ...o,
});

const repoWith = (orders: OrderDetail[], ownerId = 'c1'): OrdersRepository => ({
  listForCustomer: async (customerId) => (customerId === ownerId ? orders : []),
  findForCustomer: async (customerId, orderId) =>
    customerId === ownerId ? (orders.find((o) => o.id === orderId) ?? null) : null,
});

const fakeCart = () => ({
  addItems: vi.fn(async () => ({ cartId: 'cart1' })),
  clear: vi.fn(),
});

describe('OrdersService.list', () => {
  it.each(['placed', 'accepted', 'preparing', 'ready'] as const)(
    'lists a %s order as active only',
    async (status) => {
      const svc = new OrdersService(repoWith([orderDetail({ id: 'o1', status })]), fakeCart());
      const res = await svc.list('c1');
      expect(res.active.map((o) => o.id)).toEqual(['o1']);
      expect(res.past).toEqual([]);
    },
  );

  it.each(['completed', 'rejected', 'cancelled'] as const)(
    'lists a %s order as past only',
    async (status) => {
      const svc = new OrdersService(repoWith([orderDetail({ id: 'o1', status })]), fakeCart());
      const res = await svc.list('c1');
      expect(res.past.map((o) => o.id)).toEqual(['o1']);
      expect(res.active).toEqual([]);
    },
  );

  it('lists newest first', async () => {
    const svc = new OrdersService(
      repoWith([
        orderDetail({ id: 'old', status: 'completed', placedAt: '2026-11-01T10:00:00.000Z' }),
        orderDetail({ id: 'new', status: 'completed', placedAt: '2026-11-20T10:00:00.000Z' }),
      ]),
      fakeCart(),
    );
    expect((await svc.list('c1')).past.map((o) => o.id)).toEqual(['new', 'old']);
  });

  it('does not expose items in the summary', async () => {
    const svc = new OrdersService(repoWith([orderDetail({ id: 'o1' })]), fakeCart());
    expect((await svc.list('c1')).active[0]).not.toHaveProperty('items');
  });
});

describe('OrdersService.reorder', () => {
  const svcWith = (status: OrderStatus, cart: CartPort = fakeCart()) =>
    new OrdersService(
      repoWith([
        orderDetail({
          id: 'o1',
          status,
          items: [
            { menuItemId: 'm1', name: 'Beef pho', quantity: 1 },
            { menuItemId: 'm2', name: 'Spring rolls', quantity: 2 },
          ],
        }),
      ]),
      cart,
    );

  it('adds the past order items to the cart', async () => {
    const cart = fakeCart();
    const res = await svcWith('completed', cart).reorder('c1', 'o1');
    expect(cart.addItems).toHaveBeenCalledWith('c1', [
      { menuItemId: 'm1', quantity: 1 },
      { menuItemId: 'm2', quantity: 2 },
    ]);
    expect(res).toEqual({ cartId: 'cart1', addedItemCount: 2 });
  });

  it('never clears or replaces the existing cart', async () => {
    const cart = fakeCart();
    await svcWith('cancelled', cart).reorder('c1', 'o1');
    expect(cart.clear).not.toHaveBeenCalled();
  });

  it('rejects an unfinished order with 409', async () => {
    const cart = fakeCart();
    await expect(svcWith('preparing', cart).reorder('c1', 'o1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(cart.addItems).not.toHaveBeenCalled();
  });

  it("treats another customer's order as not found", async () => {
    await expect(svcWith('completed').reorder('someone-else', 'o1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('treats an unknown order as not found', async () => {
    await expect(svcWith('completed').reorder('c1', 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
