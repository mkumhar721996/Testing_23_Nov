import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { InMemoryOrdersRepository } from './in-memory-orders.repository';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

// AC8: the module compiles with only the repository behind the service, so no notifier,
// mailer or SMS provider can be injected, and moving an order only changes its stored step.
describe('OrdersModule wiring', () => {
  it('compiles with OrdersRepository as the only dependency', async () => {
    const repo = new InMemoryOrdersRepository();
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [OrdersService, { provide: OrdersRepository, useValue: repo }],
    }).compile();
    const service = moduleRef.get(OrdersService);

    repo.seed({
      id: 'o1',
      customerId: 'c1',
      restaurantName: 'Harbor Noodle House',
      fulfilment: 'pickup',
      status: 'placed',
      placedAt: new Date(),
    });
    const calls: string[] = [];
    const original = repo.updateStatus.bind(repo);
    repo.updateStatus = async (id, status) => {
      calls.push(`update:${status}`);
      return original(id, status);
    };

    await service.advanceStatus('o1');
    expect(calls).toEqual(['update:accepted']);
  });
});
