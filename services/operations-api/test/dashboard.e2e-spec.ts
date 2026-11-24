import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER } from '../src/auth/token-verifier';
import { SAMPLE_CUSTOMERS } from '../src/dashboard/sample-data';
import type { Product, Transaction } from '../src/dashboard/dashboard.types';

const subjects: Record<string, string> = { 'token-a': 'cust-maya', 'token-b': 'cust-two-cards' };
const idsOf = (subject: string) => SAMPLE_CUSTOMERS[subject].products.map((p) => p.id);

describe('GET /dashboard', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue({
        verify: async (token: string) => {
          if (!subjects[token]) throw new Error('invalid');
          return { subject: subjects[token] };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns only the signed-in customer's products", async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', 'Bearer token-a')
      .expect(200);
    const aIds = idsOf('cust-maya');
    const bIds = idsOf('cust-two-cards');
    expect(res.body.products.every((p: Product) => aIds.includes(p.id))).toBe(true);
    expect(res.body.products.some((p: Product) => bIds.includes(p.id))).toBe(false);
  });

  it("returns none of another customer's transactions", async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', 'Bearer token-a')
      .expect(200);
    const bTxnIds = SAMPLE_CUSTOMERS['cust-two-cards'].transactions.map((t) => t.id);
    expect(res.body.recentTransactions).toHaveLength(8);
    expect(res.body.recentTransactions.some((t: Transaction) => bTxnIds.includes(t.id))).toBe(
      false,
    );
  });

  it('ignores a customer id in the query', async () => {
    await request(app.getHttpServer())
      .get('/dashboard?customerId=cust-two-cards')
      .set('Authorization', 'Bearer token-a')
      .expect(200)
      .expect((r) => expect(r.body.customer.name).toBe('Maya'));
  });

  it('rejects a missing or invalid token', async () => {
    await request(app.getHttpServer()).get('/dashboard').expect(401);
    await request(app.getHttpServer())
      .get('/dashboard')
      .set('Authorization', 'Bearer bogus')
      .expect(401);
  });
});
