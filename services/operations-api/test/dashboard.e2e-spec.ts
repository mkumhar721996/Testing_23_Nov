import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { SAMPLE_STATS } from '../src/dashboard/sample-data';

describe('GET /dashboard/stats', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue({
        verify: async (token: string) => {
          if (token !== 'token-a') throw new Error('invalid');
          return { subject: 'user-a' };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the sample travel totals', async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard/stats')
      .set('Authorization', 'Bearer token-a')
      .expect(200);
    expect(res.body).toEqual(SAMPLE_STATS);
  });

  it('rejects a missing or invalid token', async () => {
    await request(app.getHttpServer()).get('/dashboard/stats').expect(401);
    await request(app.getHttpServer())
      .get('/dashboard/stats')
      .set('Authorization', 'Bearer bogus')
      .expect(401);
  });

  it('no longer serves the banking overview', async () => {
    await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', 'Bearer token-a')
      .expect(404);
  });
});

describe('GET /dashboard/revenue and /dashboard/destinations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue({
        verify: async (token: string) => {
          if (token !== 'token-a') throw new Error('invalid');
          return { subject: 'user-a' };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a token', async () => {
    await request(app.getHttpServer()).get('/dashboard/revenue?period=weekly').expect(401);
    await request(app.getHttpServer()).get('/dashboard/destinations?period=weekly').expect(401);
  });

  it('serves the requested period', async () => {
    const revenue = await request(app.getHttpServer())
      .get('/dashboard/revenue?period=monthly')
      .set('Authorization', 'Bearer token-a')
      .expect(200);
    expect(revenue.body.period).toBe('monthly');
    expect(revenue.body.points).toHaveLength(12);
    const destinations = await request(app.getHttpServer())
      .get('/dashboard/destinations?period=yearly')
      .set('Authorization', 'Bearer token-a')
      .expect(200);
    expect(destinations.body.period).toBe('yearly');
  });

  it('rejects a missing or unknown period', async () => {
    for (const path of ['/dashboard/destinations?period=daily', '/dashboard/destinations', '/dashboard/revenue']) {
      await request(app.getHttpServer()).get(path).set('Authorization', 'Bearer token-a').expect(400);
    }
  });

  it('leaves the stats unchanged and period-free', async () => {
    const stats = await request(app.getHttpServer())
      .get('/dashboard/stats?period=yearly')
      .set('Authorization', 'Bearer token-a')
      .expect(200);
    expect(stats.body).toEqual(SAMPLE_STATS);
  });
});
