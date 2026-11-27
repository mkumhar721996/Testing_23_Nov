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

  it('returns the trips of a month and validates the month', async () => {
    const auth = { Authorization: 'Bearer token-a' };
    const res = await request(app.getHttpServer())
      .get('/dashboard/trips?month=2028-07')
      .set(auth)
      .expect(200);
    expect(res.body.month).toBe('2028-07');
    expect(Array.isArray(res.body.trips)).toBe(true);
    await request(app.getHttpServer()).get('/dashboard/trips').set(auth).expect(400);
    await request(app.getHttpServer()).get('/dashboard/trips?month=2028-13').set(auth).expect(400);
    await request(app.getHttpServer()).get('/dashboard/trips?month=2028-07').expect(401);
  });

  it('no longer serves the banking overview', async () => {
    await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', 'Bearer token-a')
      .expect(404);
  });
});
