import { beforeEach, describe, expect, it } from 'vitest';
import { ExpenseCategoriesService } from './expense-categories.service';
import { InMemoryExpenseCategoryRepository } from './in-memory-expense-category.repository';
import { DEFAULT_CATEGORIES } from './default-categories';

const admin = { userId: 'admin-1', roles: ['admin'] };

describe('ExpenseCategoriesService', () => {
  let repo: InMemoryExpenseCategoryRepository;
  let service: ExpenseCategoriesService;

  beforeEach(() => {
    repo = new InMemoryExpenseCategoryRepository(DEFAULT_CATEGORIES);
    service = new ExpenseCategoriesService(repo);
  });

  it('AC7 lists the default set', async () => {
    expect((await service.list()).map((c) => c.name)).toEqual(DEFAULT_CATEGORIES);
  });

  it('AC1 adds a category', async () => {
    const c = await service.add('Software licences', admin);
    expect(c).toMatchObject({ name: 'Software licences', retired: false });
    expect((await service.list()).map((x) => x.name)).toContain('Software licences');
  });

  it('AC10 trims the name', async () => {
    expect((await service.add('  Parking  ', admin)).name).toBe('Parking');
  });

  it('AC9 refuses blank names', async () => {
    for (const n of ['', '   ', '\t', undefined as unknown as string, 5 as unknown as string]) {
      await expect(service.add(n, admin)).rejects.toMatchObject({ status: 400 });
    }
    expect(await service.list()).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('AC8 refuses a duplicate, ignoring case and spaces', async () => {
    await expect(service.add('  Travel  ', admin)).rejects.toMatchObject({ status: 409 });
    await expect(service.add('travel', admin)).rejects.toMatchObject({ status: 409 });
    expect(await service.list()).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('AC2 renames; refuses another category name and retired categories', async () => {
    const [first, second] = await service.list();
    expect((await service.rename(first.id, ' Flights ', admin)).name).toBe('Flights');
    await expect(service.rename(second.id, 'flights', admin)).rejects.toMatchObject({ status: 409 });
    await expect(service.rename('missing', 'X', admin)).rejects.toMatchObject({ status: 404 });
    await service.retire(second.id, admin);
    await expect(service.rename(second.id, 'Else', admin)).rejects.toMatchObject({ status: 409 });
  });

  it('AC3/AC4/AC5 retire keeps the category readable but not active', async () => {
    const { id } = (await service.list())[0];
    await service.retire(id, admin);
    await service.retire(id, admin);
    await expect(service.get(id)).resolves.toMatchObject({ id, retired: true });
    expect((await service.list()).find((c) => c.id === id)?.retired).toBe(true);
    expect((await service.list({ activeOnly: true })).some((c) => c.id === id)).toBe(false);
  });

  it('records one audit row per successful write and none for refused ones', async () => {
    const c = await service.add('Parking', admin);
    await service.rename(c.id, 'Garage', admin);
    await service.retire(c.id, admin);
    await expect(service.add('Garage', admin)).rejects.toBeDefined();
    expect(repo.audit.map((a) => [a.action, a.actor])).toEqual([
      ['add', 'admin-1'],
      ['rename', 'admin-1'],
      ['retire', 'admin-1'],
    ]);
  });
});
