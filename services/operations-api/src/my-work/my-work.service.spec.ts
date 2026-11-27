import { describe, expect, it, vi } from 'vitest';
import type { DefectRepository } from './defect.repository';
import { MyWorkService } from './my-work.service';

const stub = (open: number, recent: number): DefectRepository => ({
  findOpenAssigned: vi.fn(async () => ({ items: [], total: open })),
  findRecentInProjects: vi.fn(async () =>
    Array.from({ length: recent }, (_, i) => ({ id: `d${i}` }) as never),
  ),
  findProjects: vi.fn(async () => []),
});

describe('MyWorkService', () => {
  it('asks the repository for 10 rows of each list for the given person', async () => {
    const repo = stub(0, 0);
    await new MyWorkService(repo).getMyWork('me');
    expect(repo.findOpenAssigned).toHaveBeenCalledWith('me', 10);
    expect(repo.findRecentInProjects).toHaveBeenCalledWith('me', 10);
    expect(repo.findProjects).toHaveBeenCalledWith('me');
  });

  it.each([
    [0, 0, false],
    [1, 0, true],
    [0, 1, true],
  ])('hasAnyDefects for open=%i recent=%i is %s', async (open, recent, expected) => {
    const res = await new MyWorkService(stub(open, recent)).getMyWork('me');
    expect(res.hasAnyDefects).toBe(expected);
  });
});
