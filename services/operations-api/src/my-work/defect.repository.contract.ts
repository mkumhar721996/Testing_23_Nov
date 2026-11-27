import { beforeEach, describe, expect, it } from 'vitest';
import type { DefectRepository } from './defect.repository';
import type { SeedData, SeedDefect } from './in-memory-defect.repository';
import { MyWorkService } from './my-work.service';

export type RepositoryFixture = { repo: DefectRepository; seed(data: SeedData): Promise<void> };

export const PAYMENTS = { id: 'p1', name: 'Payments portal', members: ['me'] };
export const FIELD = { id: 'p2', name: 'Field service app', members: ['me'] };
export const FOREIGN = { id: 'p9', name: 'Somebody else', members: ['other'] };

const at = (n: number) => new Date(Date.UTC(2026, 10, 1, 0, n)).toISOString();

export function defect(overrides: Partial<SeedDefect> & { id: string }): SeedDefect {
  return {
    key: `DEF-${overrides.id}`,
    title: `Title ${overrides.id}`,
    severity: 'Medium',
    status: 'Open',
    projectId: 'p1',
    assigneeId: null,
    createdByName: 'Manoj',
    updatedAt: at(0),
    ...overrides,
  };
}

// Shared contract: every DefectRepository implementation (in-memory and PostgreSQL) must pass it.
export function describeDefectRepository(name: string, setup: () => Promise<RepositoryFixture>) {
  describe(`DefectRepository contract: ${name}`, () => {
    let fixture: RepositoryFixture;
    let service: MyWorkService;

    beforeEach(async () => {
      fixture = await setup();
      service = new MyWorkService(fixture.repo);
    });

    it.each(['New', 'Open', 'In Progress', 'Reopened', 'Resolved'])(
      'lists a %s defect assigned to the person as open',
      async (status) => {
        await fixture.seed({
          projects: [PAYMENTS],
          defects: [defect({ id: 'd1', assigneeId: 'me', status })],
        });
        const res = await service.getMyWork('me');
        expect(res.openDefects.items.map((x) => x.id)).toEqual(['d1']);
        expect(res.openDefects.total).toBe(1);
      },
    );

    it('does not list a Closed assigned defect as open but keeps it in recently updated', async () => {
      await fixture.seed({
        projects: [PAYMENTS],
        defects: [defect({ id: 'd2', assigneeId: 'me', status: 'Closed' })],
      });
      const res = await service.getMyWork('me');
      expect(res.openDefects.items.map((x) => x.id)).not.toContain('d2');
      expect(res.openDefects.total).toBe(0);
      expect(res.recentlyUpdated.map((x) => x.id)).toEqual(['d2']);
    });

    it('does not list defects assigned to someone else as open', async () => {
      await fixture.seed({
        projects: [{ ...PAYMENTS, members: ['me', 'other'] }],
        defects: [defect({ id: 'd1', assigneeId: 'other' })],
      });
      const res = await service.getMyWork('me');
      expect(res.openDefects.items).toEqual([]);
      expect(res.recentlyUpdated.map((x) => x.id)).toEqual(['d1']);
    });

    it('includes defects from both projects and none from a project the person is not in', async () => {
      await fixture.seed({
        projects: [PAYMENTS, FIELD, FOREIGN],
        defects: [
          defect({ id: 'a', projectId: 'p1', updatedAt: at(1) }),
          defect({ id: 'b', projectId: 'p2', updatedAt: at(2) }),
          defect({ id: 'foreign', projectId: 'p9', assigneeId: 'me', updatedAt: at(3) }),
        ],
      });
      const res = await service.getMyWork('me');
      expect(new Set(res.recentlyUpdated.map((x) => x.projectName))).toEqual(
        new Set(['Payments portal', 'Field service app']),
      );
      expect(res.recentlyUpdated.map((x) => x.id)).not.toContain('foreign');
      expect(res.openDefects.items.map((x) => x.id)).not.toContain('foreign');
      expect((await service.getMyWork('me')).projects.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    });

    it('lists exactly the 10 most recently modified of 12 defects', async () => {
      await fixture.seed({
        projects: [PAYMENTS],
        defects: Array.from({ length: 12 }, (_, i) =>
          defect({ id: `d${i + 1}`, updatedAt: at(i + 1) }),
        ),
      });
      const ids = (await service.getMyWork('me')).recentlyUpdated.map((x) => x.id);
      expect(ids).toHaveLength(10);
      expect(ids).toEqual(['d12', 'd11', 'd10', 'd9', 'd8', 'd7', 'd6', 'd5', 'd4', 'd3']);
      expect(ids).not.toContain('d1');
      expect(ids).not.toContain('d2');
    });

    it('returns an empty result for a person with no defects and for an unknown person', async () => {
      await fixture.seed({ projects: [PAYMENTS], defects: [] });
      const empty = { hasAnyDefects: false, openDefects: { items: [], total: 0 }, recentlyUpdated: [] };
      expect(await service.getMyWork('me')).toMatchObject(empty);
      expect(await service.getMyWork('new-user')).toMatchObject({ ...empty, projects: [] });
    });

    it('lists open assigned defects newest modified first', async () => {
      await fixture.seed({
        projects: [PAYMENTS],
        defects: [
          defect({ id: 'oldest', assigneeId: 'me', updatedAt: at(1) }),
          defect({ id: 'newest', assigneeId: 'me', updatedAt: at(3) }),
          defect({ id: 'middle', assigneeId: 'me', updatedAt: at(2) }),
        ],
      });
      const res = await service.getMyWork('me');
      expect(res.openDefects.items.map((x) => x.id)).toEqual(['newest', 'middle', 'oldest']);
    });

    it('caps open assigned defects at 10 but reports the total of 11', async () => {
      await fixture.seed({
        projects: [PAYMENTS],
        defects: Array.from({ length: 11 }, (_, i) =>
          defect({ id: `d${i + 1}`, assigneeId: 'me', updatedAt: at(i + 1) }),
        ),
      });
      const res = await service.getMyWork('me');
      expect(res.openDefects.items).toHaveLength(10);
      expect(res.openDefects.total).toBe(11);
    });

    it('has defects but nothing open when only unassigned defects exist in the projects', async () => {
      await fixture.seed({ projects: [PAYMENTS], defects: [defect({ id: 'd1' })] });
      const res = await service.getMyWork('me');
      expect(res.hasAnyDefects).toBe(true);
      expect(res.openDefects.total).toBe(0);
      expect(res.recentlyUpdated).toHaveLength(1);
    });

    it('returns the summary fields', async () => {
      await fixture.seed({
        projects: [PAYMENTS],
        defects: [defect({ id: 'd1', title: 'Fix login', severity: 'High', updatedAt: at(5) })],
      });
      const [first] = (await service.getMyWork('me')).recentlyUpdated;
      expect(first).toMatchObject({
        id: 'd1',
        title: 'Fix login',
        severity: 'High',
        status: 'Open',
        projectName: 'Payments portal',
        createdByName: 'Manoj',
      });
      expect(first.updatedAt).toBe(at(5));
      expect(first.key).toBeTruthy();
    });
  });
}
