import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PRINCIPAL_RESOLVER } from '../src/auth/principal';
import type { Principal } from '../src/auth/principal';
import { EXPENSE_CATEGORY_REPOSITORY } from '../src/expense-categories/expense-category.repository';
import { InMemoryExpenseCategoryRepository } from '../src/expense-categories/in-memory-expense-category.repository';
import { DEFAULT_CATEGORIES } from '../src/expense-categories/default-categories';

describe('expense categories', () => {
  let app: INestApplication;
  let current: Principal | null = null;
  const as = (p: Principal | null) => (current = p);
  const admin = { userId: 'a1', roles: ['admin'] };
  const user = { userId: 'u1', roles: ['user'] };
  const http = () => request(app.getHttpServer());
  const names = async (q = '') => (await http().get('/expense-categories' + q).expect(200)).body.categories;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRINCIPAL_RESOLVER)
      .useValue({ resolve: () => current })
      .overrideProvider(EXPENSE_CATEGORY_REPOSITORY)
      .useValue(new InMemoryExpenseCategoryRepository(DEFAULT_CATEGORIES))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('AC7 lists the default set', async () => {
    as(admin);
    expect((await names()).map((c: any) => c.name)).toEqual(DEFAULT_CATEGORIES);
  });

  it('AC1 and AC10 add, trimmed', async () => {
    as(admin);
    await http().post('/expense-categories').send({ name: 'Software licences' }).expect(201);
    await http().post('/expense-categories').send({ name: '  Parking  ' }).expect(201);
    const list = (await names()).map((c: any) => c.name);
    expect(list).toContain('Software licences');
    expect(list).toContain('Parking');
  });

  it('AC2 rename', async () => {
    as(admin);
    const travel = (await names()).find((c: any) => c.name === 'Travel');
    await http().patch(`/expense-categories/${travel.id}`).send({ name: 'Flights' }).expect(200);
    const list = (await names()).map((c: any) => c.name);
    expect(list).toContain('Flights');
    expect(list).not.toContain('Travel');
  });

  it('AC3 and AC5 retire hides it from the active list only', async () => {
    as(admin);
    const id = (await names()).find((c: any) => c.name === 'Meals').id;
    await http().post(`/expense-categories/${id}/retire`).expect(201);
    expect((await names()).find((c: any) => c.id === id).retired).toBe(true);
    expect((await names('?active=true')).some((c: any) => c.id === id)).toBe(false);
  });

  it('AC8 duplicate and AC9 blank are refused, list unchanged', async () => {
    as(admin);
    const before = await names();
    const dup = await http().post('/expense-categories').send({ name: ' Lodging ' }).expect(409);
    expect(dup.body.code).toBe('name_taken');
    const blank = await http().post('/expense-categories').send({ name: '   ' }).expect(400);
    expect(blank.body.code).toBe('name_blank');
    await http().post('/expense-categories').send({}).expect(400);
    expect(await names()).toEqual(before);
  });

  it('AC6 non-admin writes get 403 and change nothing; canManage is false', async () => {
    as(user);
    const before = await names();
    const id = before[0].id;
    for (const r of [
      http().post('/expense-categories').send({ name: 'Sneaky' }),
      http().patch(`/expense-categories/${id}`).send({ name: 'Sneaky' }),
      http().post(`/expense-categories/${id}/retire`),
    ]) {
      const res = await r.expect(403);
      expect(res.body.code).toBe('not_admin');
    }
    const after = await http().get('/expense-categories').expect(200);
    expect(after.body.categories).toEqual(before);
    expect(after.body.canManage).toBe(false);
  });

  it('answers 401 with no principal', async () => {
    as(null);
    await http().get('/expense-categories').expect(401);
    await http().post('/expense-categories').send({ name: 'X' }).expect(401);
  });
});
