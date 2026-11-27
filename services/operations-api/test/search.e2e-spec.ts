import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';

describe('GET /search', () => {
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

  it('returns matching trips and bookings', async () => {
    const res = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'Paris' })
      .set('Authorization', 'Bearer token-a')
      .expect(200);
    expect(res.body.trips.map((t: { id: string }) => t.id)).toContain('T-101');
    expect(res.body.bookings.map((b: { id: string }) => b.id)).toContain('B-2041');
  });

  it('rejects a missing token', async () => {
    await request(app.getHttpServer()).get('/search').query({ q: 'Paris' }).expect(401);
  });

  it('rejects a blank term', async () => {
    await request(app.getHttpServer())
      .get('/search')
      .query({ q: '  ' })
      .set('Authorization', 'Bearer token-a')
      .expect(400);
  });
});
