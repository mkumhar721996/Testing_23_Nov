import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryOrdersRepository } from './in-memory-orders.repository';
import { ORDER_STEPS, type OrderStep } from './order-status';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let repo: InMemoryOrdersRepository;
  let service: OrdersService;

  const seed = (id: string, status: OrderStep, customerId = 'c1', fulfilment: 'pickup' | 'delivery' = 'pickup') =>
    repo.seed({
      id,
      customerId,
      restaurantName: 'Harbor Noodle House',
      fulfilment,
      status,
      placedAt: new Date('2026-11-23T12:14:00Z'),
    });

  beforeEach(() => {
    repo = new InMemoryOrdersRepository();
    service = new OrdersService(repo);
  });

  it('returns all five steps in order with the single current step', async () => {
    seed('o1', 'preparing');
    const view = await service.getForCustomer('c1', 'o1');
    expect(view.steps.map((s) => s.label)).toEqual(['Placed', 'Accepted', 'Preparing', 'Ready', 'Completed']);
    expect(view.steps.map((s) => s.key)).toEqual([...ORDER_STEPS]);
    expect(view.status).toBe('preparing');
    expect(view.placedAt).toBe('2026-11-23T12:14:00.000Z');
  });

  it.each(ORDER_STEPS)('reports the stored step %s', async (step) => {
    seed('o1', step);
    expect((await service.getForCustomer('c1', 'o1')).status).toBe(step);
  });

  it('labels Ready as Out for delivery for a delivery order', async () => {
    seed('o1', 'ready', 'c1', 'delivery');
    const view = await service.getForCustomer('c1', 'o1');
    expect(view.steps.find((s) => s.key === 'ready')?.label).toBe('Out for delivery');
  });

  it('treats another customer order as not found', async () => {
    seed('o1', 'placed', 'c2');
    await expect(service.getForCustomer('c1', 'o1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only the customer orders', async () => {
    seed('o1', 'placed');
    seed('o2', 'ready');
    seed('o3', 'placed', 'c2');
    const list = await service.listForCustomer('c1');
    expect(list.map((o) => o.id).sort()).toEqual(['o1', 'o2']);
  });

  it('advances to the next step', async () => {
    seed('o1', 'placed');
    expect((await service.advanceStatus('o1')).status).toBe('accepted');
    expect((await service.getForCustomer('c1', 'o1')).status).toBe('accepted');
  });

  it('rejects advancing a completed order and an unknown order', async () => {
    seed('o1', 'completed');
    await expect(service.advanceStatus('o1')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.advanceStatus('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
