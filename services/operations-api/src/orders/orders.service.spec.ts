import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryOrderRepository } from './in-memory-order.repository';
import type { Order } from './order.repository';
import { OrdersService } from './orders.service';

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

function setup(orders: Order[]) {
  const repo = new InMemoryOrderRepository(orders);
  const refund = { refundFull: vi.fn().mockResolvedValue(undefined) };
  return { repo, refund, service: new OrdersService(repo, refund) };
}

describe('OrdersService', () => {
  it('reports canCancel from the status', async () => {
    const { service } = setup([order('1', 'placed'), order('2', 'accepted')]);
    expect(await service.get('1', 'c1')).toMatchObject({ status: 'placed', canCancel: true });
    expect(await service.get('2', 'c1')).toMatchObject({ status: 'accepted', canCancel: false });
  });

  it('cancels a placed order and refunds the full amount exactly once, after the cancel', async () => {
    const { repo, refund, service } = setup([order('1', 'placed')]);
    refund.refundFull.mockImplementation(async () => {
      expect((await repo.findById('1'))?.status).toBe('cancelled');
    });
    const cancelled = await service.cancel('1', 'c1');
    expect(cancelled).toMatchObject({ status: 'cancelled', canCancel: false });
    expect(refund.refundFull).toHaveBeenCalledExactlyOnceWith('1');
  });

  it('answers 409 and does not refund again on a second cancel', async () => {
    const { refund, service } = setup([order('1', 'placed')]);
    await service.cancel('1', 'c1');
    await expect(service.cancel('1', 'c1')).rejects.toBeInstanceOf(ConflictException);
    expect(refund.refundFull).toHaveBeenCalledTimes(1);
  });

  it.each(['accepted', 'rejected'] as const)(
    'does not cancel or refund a %s order',
    async (status) => {
      const { repo, refund, service } = setup([order('1', status)]);
      await expect(service.cancel('1', 'c1')).rejects.toMatchObject({
        response: { code: 'ORDER_NOT_CANCELLABLE', status },
      });
      expect(refund.refundFull).not.toHaveBeenCalled();
      expect((await repo.findById('1'))?.status).toBe(status);
    },
  );

  it('throws not found for an unknown order', async () => {
    const { service } = setup([]);
    await expect(service.cancel('9', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuses another customer's order without cancelling it", async () => {
    const { repo, refund, service } = setup([order('1', 'placed')]);
    await expect(service.cancel('1', 'someone-else')).rejects.toBeInstanceOf(ForbiddenException);
    expect(refund.refundFull).not.toHaveBeenCalled();
    expect((await repo.findById('1'))?.status).toBe('placed');
  });
});
