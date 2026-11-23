import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, addCategory, listCategories, renameCategory, retireCategory } from './expenseCategories';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('expense categories client', () => {
  it('lists, asking for active categories only when told to', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { categories: [], canManage: true }));
    vi.stubGlobal('fetch', fetchMock);
    await listCategories();
    await listCategories({ activeOnly: true });
    expect(fetchMock.mock.calls[0][0]).toBe('/expense-categories');
    expect(fetchMock.mock.calls[1][0]).toBe('/expense-categories?active=true');
  });

  it('sends add, rename and retire to the right routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { id: 'c1', name: 'X', retired: false }));
    vi.stubGlobal('fetch', fetchMock);
    await addCategory('X');
    await renameCategory('c1', 'Y');
    await retireCategory('c1');
    const calls = fetchMock.mock.calls.map(([url, init]) => [init.method, url]);
    expect(calls).toEqual([
      ['POST', '/expense-categories'],
      ['PATCH', '/expense-categories/c1'],
      ['POST', '/expense-categories/c1/retire'],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'X' });
  });

  it('throws an ApiError carrying the code and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(403, { code: 'not_admin', message: 'No.' })));
    await expect(addCategory('X')).rejects.toMatchObject({ code: 'not_admin', status: 403 });
    await expect(addCategory('X')).rejects.toBeInstanceOf(ApiError);
  });
});
