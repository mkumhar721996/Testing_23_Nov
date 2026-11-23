import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FakeRestaurantsRepository,
  NOODLES_ID,
  UNKNOWN_ID,
  sampleMenus,
} from './fake-restaurants.repository';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

function setup() {
  const repo = new FakeRestaurantsRepository(sampleMenus());
  const controller = new RestaurantsController(new RestaurantsService(repo));
  return { repo, controller };
}

describe('RestaurantsController.list', () => {
  let controller: RestaurantsController;
  beforeEach(() => {
    ({ controller } = setup());
  });

  it('lists every restaurant when no location is given (AC1)', async () => {
    expect((await controller.list(undefined)).restaurants).toHaveLength(3);
    expect((await controller.list('   ')).restaurants).toHaveLength(3);
  });

  it('includes restaurants serving the location (AC5)', async () => {
    const res = await controller.list('2040');
    expect(res.restaurants.map((r) => r.name)).toContain('Green Bowl Kitchen');
  });

  it('omits restaurants that do not serve the location (AC6)', async () => {
    const res = await controller.list('2040');
    expect(res.restaurants.map((r) => r.name)).not.toContain("Sultan's Grill");
  });

  it('trims the location', async () => {
    expect((await controller.list(' 2040 ')).restaurants).toHaveLength(1);
  });

  it('keeps closed restaurants, marked closed (AC7)', async () => {
    const all = await controller.list(undefined);
    expect(all.restaurants.find((r) => r.name === 'Green Bowl Kitchen')?.isOpen).toBe(false);
    const located = await controller.list('2040');
    expect(located.restaurants[0].isOpen).toBe(false);
  });

  it('returns an empty list for a location nobody serves (AC9, AC10)', async () => {
    expect((await controller.list('9999')).restaurants).toEqual([]);
  });
});

describe('RestaurantsController.menu', () => {
  it('returns the menu with unavailable items kept (AC2, AC8)', async () => {
    const { controller } = setup();
    const menu = await controller.menu(NOODLES_ID);
    expect(menu.categories[0].items).toHaveLength(2);
    expect(menu.categories[0].items[1].isAvailable).toBe(false);
  });

  it('throws NotFound for an unknown restaurant', async () => {
    const { controller } = setup();
    await expect(controller.menu(UNKNOWN_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
