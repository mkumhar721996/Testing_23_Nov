import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { defect } from './defect.repository.contract';
import { InMemoryDefectRepository } from './in-memory-defect.repository';
import { ProjectHealthService } from './project-health.service';

const A = { id: 'A', name: 'Alpha', members: ['me'] };
const B = { id: 'B', name: 'Bravo', members: ['me'] };
const C = { id: 'C', name: 'Charlie', members: ['other'] };

describe('ProjectHealthService', () => {
  let repo: InMemoryDefectRepository;
  let health: ProjectHealthService;

  beforeEach(() => {
    repo = new InMemoryDefectRepository();
    health = new ProjectHealthService(repo);
  });

  it('returns every status and severity with zeros (AC1, AC2)', async () => {
    await repo.seed({ projects: [A], defects: [defect({ id: 'd1', projectId: 'A' })] });
    const res = await health.getProjectHealth('me');
    expect(res.byStatus.map((c) => c.name)).toEqual([
      'New',
      'Open',
      'In Progress',
      'Reopened',
      'Resolved',
      'Closed',
    ]);
    expect(res.byStatus.find((c) => c.name === 'Open')?.count).toBe(1);
    expect(res.byStatus.filter((c) => c.name !== 'Open').every((c) => c.count === 0)).toBe(true);
    expect(res.bySeverity.map((c) => c.name)).toEqual(['Critical', 'High', 'Medium', 'Low']);
    expect(res.bySeverity.find((c) => c.name === 'Medium')?.count).toBe(1);
  });

  it('lists only the projects the person belongs to, by name (AC3)', async () => {
    await repo.seed({ projects: [C, B, A], defects: [] });
    const res = await health.getProjectHealth('me');
    expect(res.projects.map((p) => p.id)).toEqual(['A', 'B']);
  });

  it('selects the last viewed project, also from another service instance (AC4)', async () => {
    await repo.seed({ projects: [A, B], defects: [] });
    await repo.setLastViewedProjectId('me', 'B');
    const res = await new ProjectHealthService(repo).getProjectHealth('me');
    expect(res.selectedProjectId).toBe('B');
    expect(res.selectionReason).toBe('last-viewed');
  });

  it('selects the first project by name on a first visit (AC5)', async () => {
    await repo.seed({ projects: [B, A], defects: [] });
    const res = await health.getProjectHealth('me');
    expect(res.selectedProjectId).toBe('A');
    expect(res.selectionReason).toBe('first-visit');
    expect(await repo.getLastViewedProjectId('me')).toBeNull();
  });

  it('counts only the selected project (AC6)', async () => {
    await repo.seed({
      projects: [A, B],
      defects: [
        ...Array.from({ length: 5 }, (_, i) => defect({ id: `a${i}`, projectId: 'A' })),
        ...Array.from({ length: 3 }, (_, i) => defect({ id: `b${i}`, projectId: 'B' })),
      ],
    });
    const res = await health.getProjectHealth('me');
    expect(res.total).toBe(5);
    expect(res.byStatus.reduce((n, c) => n + c.count, 0)).toBe(5);
    expect(res.bySeverity.reduce((n, c) => n + c.count, 0)).toBe(5);
  });

  it('switches counts and remembers the pick (AC7)', async () => {
    await repo.seed({
      projects: [A, B],
      defects: [defect({ id: 'a1', projectId: 'A' }), defect({ id: 'b1', projectId: 'B' })],
    });
    const res = await health.selectProject('me', 'B');
    expect(res.selectedProjectId).toBe('B');
    expect(res.selectionReason).toBe('picked');
    expect(res.total).toBe(1);
    expect((await health.getProjectHealth('me')).selectedProjectId).toBe('B');
  });

  it('refuses a project the person has no role in and does not write (AC3, ADR-0010)', async () => {
    await repo.seed({ projects: [A, C], defects: [] });
    await expect(health.selectProject('me', 'C')).rejects.toBeInstanceOf(ForbiddenException);
    expect(await repo.getLastViewedProjectId('me')).toBeNull();
  });

  it('shows zero counts for a project with no defects (AC8)', async () => {
    await repo.seed({ projects: [A], defects: [] });
    const res = await health.getProjectHealth('me');
    expect(res.total).toBe(0);
    expect(res.byStatus.every((c) => c.count === 0)).toBe(true);
  });

  it('returns no projects and no selection without any role (AC11-13)', async () => {
    await repo.seed({ projects: [C], defects: [] });
    const res = await health.getProjectHealth('me');
    expect(res.projects).toEqual([]);
    expect(res.selectedProjectId).toBeNull();
    expect(res.selectionReason).toBeNull();
    expect(res.total).toBe(0);
  });

  it('falls back to the first project when last viewed is no longer theirs (AC14)', async () => {
    await repo.seed({ projects: [A, B, C], defects: [] });
    await repo.setLastViewedProjectId('me', 'C');
    const res = await health.getProjectHealth('me');
    expect(res.selectedProjectId).toBe('A');
    expect(res.selectionReason).toBe('fallback');
  });
});
