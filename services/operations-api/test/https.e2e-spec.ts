import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/test-app';

describe('AC4 plain HTTP', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('returns no onboarding data over plain HTTP', async () => {
    const plain = await request(t.server).get('/onboarding-records').set('Authorization', 'Bearer admin');
    expect(plain.status).toBe(426);
    expect(plain.body).toEqual({ message: 'HTTPS is required' });
  });

  it('serves the same request over HTTPS with HSTS', async () => {
    const secure = await request(t.server)
      .get('/onboarding-records')
      .set('Authorization', 'Bearer admin')
      .set('X-Forwarded-Proto', 'https');
    expect(secure.status).toBe(200);
    expect(secure.headers['strict-transport-security']).toContain('max-age=');
  });

  it('keeps /health reachable for load-balancer checks', async () => {
    await request(t.server).get('/health').expect(200);
  });
});
