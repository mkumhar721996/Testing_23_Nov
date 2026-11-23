import type { RestaurantRepository } from './restaurants.repository';
import type { RestaurantMenu, RestaurantSummary } from './restaurants.types';

/** In-memory repository for tests, so they run without a database. */
export class FakeRestaurantsRepository implements RestaurantRepository {
  constructor(public menus: RestaurantMenu[]) {}

  async list(location?: string): Promise<RestaurantSummary[]> {
    return this.menus
      .filter((m) => !location || m.serviceLocations.includes(location))
      .map(({ id, name, cuisine, isOpen, hoursLabel, deliveryFeeCents, etaLabel }) => ({
        id,
        name,
        cuisine,
        isOpen,
        hoursLabel,
        deliveryFeeCents,
        etaLabel,
      }));
  }

  async findMenu(id: string): Promise<RestaurantMenu | null> {
    return this.menus.find((m) => m.id === id) ?? null;
  }

  rename(from: string, to: string): void {
    for (const menu of this.menus) {
      for (const category of menu.categories) {
        for (const item of category.items) {
          if (item.name === from) item.name = to;
        }
      }
    }
  }
}

export const NOODLES_ID = '11111111-1111-4111-8111-111111111111';
export const GREEN_ID = '22222222-2222-4222-8222-222222222222';
export const GRILL_ID = '33333333-3333-4333-8333-333333333333';
export const UNKNOWN_ID = '99999999-9999-4999-8999-999999999999';

const base = {
  cuisine: 'Mixed',
  hoursLabel: 'Open 10:00 to 22:00',
  deliveryFeeCents: 350,
  etaLabel: '25–35 min',
  menuUpdatedAt: '2026-11-23T08:00:00.000Z',
};

export function sampleMenus(): RestaurantMenu[] {
  return [
    {
      ...base,
      id: NOODLES_ID,
      name: 'Harbour Street Noodles',
      cuisine: 'Japanese',
      isOpen: true,
      serviceLocations: ['2000', '2010'],
      categories: [
        {
          name: 'Ramen',
          items: [
            { id: 'i1', name: 'Shoyu ramen', description: '', priceCents: 1450, isAvailable: true },
            {
              id: 'i2',
              name: 'Spicy tonkotsu ramen',
              description: 'Rich pork broth',
              priceCents: 1650,
              isAvailable: false,
            },
          ],
        },
      ],
    },
    {
      ...base,
      id: GREEN_ID,
      name: 'Green Bowl Kitchen',
      isOpen: false,
      serviceLocations: ['2040'],
      categories: [],
    },
    {
      ...base,
      id: GRILL_ID,
      name: "Sultan's Grill",
      isOpen: true,
      serviceLocations: ['3000'],
      categories: [],
    },
  ];
}
