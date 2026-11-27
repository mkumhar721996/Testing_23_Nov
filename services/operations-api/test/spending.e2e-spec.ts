import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { PG_POOL } from '../src/db/database.module';
import { TRANSACTION_REPOSITORY } from '../src/spending/transaction.repository';

describe('GET /spending/monthly', () => {
  let app: INestApplication;
  const repo = {
    sumMonthlySpendingByCategory: vi.fn(async () => [{ category: 'Groceries', totalMinor: 2400 }]),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PG_POOL)
      .useValue({ end: async () => undefined })
      .overrideProvider(TRANSACTION_REPOSITORY)
      .useValue(repo)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue({
        verify: async (token: string) => {
          if (token !== 'token-sub') throw new Error('invalid');
          return { subject: 'token-sub' };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a missing token', async () => {
    await request(app.getHttpServer()).get('/spending/monthly').expect(401);
  });

  it('takes the customer from the token even when a customerId is sent', async () => {
    const res = await request(app.getHttpServer())
      .get('/spending/monthly?customerId=other&timeZone=Europe/London')
      .set('Authorization', 'Bearer token-sub')
      .expect(200);
    expect(res.body.categories).toEqual([{ category: 'Groceries', totalMinor: 2400 }]);
    expect(repo.sumMonthlySpendingByCategory).toHaveBeenCalledWith(
      'token-sub',
      'Europe/London',
      expect.any(Date),
    );
  });

  it('falls back to UTC for an invalid time zone', async () => {
    await request(app.getHttpServer())
      .get('/spending/monthly?timeZone=Nope/Nowhere')
      .set('Authorization', 'Bearer token-sub')
      .expect(200);
    expect(repo.sumMonthlySpendingByCategory).toHaveBeenCalledWith(
      'token-sub',
      'UTC',
      expect.any(Date),
    );
  });
});
