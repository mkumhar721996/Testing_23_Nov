import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import {
  FakeRestaurantsRepository,
  NOODLES_ID,
  UNKNOWN_ID,
  sampleMenus,
} from '../src/restaurants/fake-restaurants.repository';
import { RESTAURANT_REPOSITORY } from '../src/restaurants/restaurants.repository';

describe('restaurants (public, no Authorization header)', () => {
  let app: INestApplication;
  const repo = new FakeRestaurantsRepository(sampleMenus());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RESTAURANT_REPOSITORY)
      .useValue(repo)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists restaurants without credentials (AC1)', async () => {
    const res = await request(app.getHttpServer()).get('/restaurants').expect(200);
    expect(res.body.restaurants).toHaveLength(3);
  });

  it('filters by location (AC5, AC6)', async () => {
    const res = await request(app.getHttpServer()).get('/restaurants?location=2040').expect(200);
    expect(res.body.restaurants.map((r: { name: string }) => r.name)).toEqual([
      'Green Bowl Kitchen',
    ]);
  });

  it('answers 200 with an empty list for an unserved location (AC9, AC10)', async () => {
    const res = await request(app.getHttpServer()).get('/restaurants?location=9999').expect(200);
    expect(res.body).toEqual({ restaurants: [] });
  });

  it('returns a menu without credentials (AC2, AC4, AC8)', async () => {
    const res = await request(app.getHttpServer()).get(`/restaurants/${NOODLES_ID}/menu`).expect(200);
    expect(res.body.categories[0].name).toBe('Ramen');
    expect(res.body.categories[0].items[0]).toMatchObject({ name: 'Shoyu ramen', priceCents: 1450 });
    expect(res.body.categories[0].items[1].isAvailable).toBe(false);
  });

  it('rejects a malformed id and 404s an unknown one', async () => {
    await request(app.getHttpServer()).get('/restaurants/not-a-uuid/menu').expect(400);
    await request(app.getHttpServer()).get(`/restaurants/${UNKNOWN_ID}/menu`).expect(404);
  });

  it('shows an updated menu at once and is not cacheable (AC3)', async () => {
    const url = `/restaurants/${NOODLES_ID}/menu`;
    await request(app.getHttpServer()).get(url).expect('Cache-Control', 'no-store');
    repo.rename('Shoyu ramen', 'Shoyu ramen deluxe');
    const second = await request(app.getHttpServer()).get(url);
    expect(second.body.categories[0].items[0].name).toBe('Shoyu ramen deluxe');
  });
});
