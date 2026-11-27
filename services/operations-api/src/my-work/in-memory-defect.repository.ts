import type { DefectRepository } from './defect.repository';
import type { DefectSummary } from './my-work.types';

export type SeedProject = { id: string; name: string; members: string[] };
export type SeedDefect = Omit<DefectSummary, 'projectName'> & {
  projectId: string;
  assigneeId: string | null;
};
export type SeedData = { projects: SeedProject[]; defects: SeedDefect[] };

// Second implementation of the DefectRepository port, for service and supertest tests;
// production uses PgDefectRepository.
export class InMemoryDefectRepository implements DefectRepository {
  private data: SeedData = { projects: [], defects: [] };

  async seed(data: SeedData): Promise<void> {
    this.data = data;
  }

  private visibleTo(personId: string): SeedDefect[] {
    const mine = new Set(
      this.data.projects.filter((p) => p.members.includes(personId)).map((p) => p.id),
    );
    return this.data.defects
      .filter((d) => mine.has(d.projectId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
  }

  private summary({ projectId, assigneeId: _assignee, ...rest }: SeedDefect): DefectSummary {
    const project = this.data.projects.find((p) => p.id === projectId);
    return { ...rest, projectName: project?.name ?? '' };
  }

  async findOpenAssigned(personId: string, limit: number) {
    const open = this.visibleTo(personId).filter(
      (d) => d.assigneeId === personId && d.status !== 'Closed',
    );
    return { items: open.slice(0, limit).map((d) => this.summary(d)), total: open.length };
  }

  async findRecentInProjects(personId: string, limit: number) {
    return this.visibleTo(personId)
      .slice(0, limit)
      .map((d) => this.summary(d));
  }

  async countByProject(personId: string, projectId: string) {
    const inProject = this.visibleTo(personId).filter((d) => d.projectId === projectId);
    const tally = (key: 'status' | 'severity') =>
      inProject.reduce<Record<string, number>>((acc, d) => {
        acc[d[key]] = (acc[d[key]] ?? 0) + 1;
        return acc;
      }, {});
    return { total: inProject.length, byStatus: tally('status'), bySeverity: tally('severity') };
  }

  private lastViewed = new Map<string, string>();

  async getLastViewedProjectId(personId: string) {
    return this.lastViewed.get(personId) ?? null;
  }

  async setLastViewedProjectId(personId: string, projectId: string) {
    this.lastViewed.set(personId, projectId);
  }

  async findProjects(personId: string) {
    return this.data.projects
      .filter((p) => p.members.includes(personId))
      .map(({ id, name }) => ({ id, name }));
  }
}
