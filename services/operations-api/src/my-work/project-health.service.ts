import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DEFECT_REPOSITORY, type DefectRepository } from './defect.repository';
import {
  DEFECT_SEVERITIES,
  DEFECT_STATUSES,
  type ProjectHealthResponse,
  type ProjectSummary,
} from './my-work.types';

@Injectable()
export class ProjectHealthService {
  constructor(@Inject(DEFECT_REPOSITORY) private readonly defects: DefectRepository) {}

  // Never writes: only selectProject persists the last viewed project.
  async getProjectHealth(personId: string): Promise<ProjectHealthResponse> {
    const [found, lastViewed] = await Promise.all([
      this.defects.findProjects(personId),
      this.defects.getLastViewedProjectId(personId),
    ]);
    const projects = sortByName(found);
    if (lastViewed && projects.some((p) => p.id === lastViewed)) {
      return this.build(personId, projects, lastViewed, 'last-viewed');
    }
    if (projects.length === 0) return this.build(personId, projects, null, null);
    return this.build(
      personId,
      projects,
      projects[0].id,
      lastViewed ? 'fallback' : 'first-visit',
    );
  }

  async selectProject(personId: string, projectId: string): Promise<ProjectHealthResponse> {
    const projects = sortByName(await this.defects.findProjects(personId));
    if (!projects.some((p) => p.id === projectId)) {
      throw new ForbiddenException('You do not have a role in this project');
    }
    await this.defects.setLastViewedProjectId(personId, projectId);
    return this.build(personId, projects, projectId, 'picked');
  }

  private async build(
    personId: string,
    projects: ProjectSummary[],
    selectedProjectId: string | null,
    selectionReason: ProjectHealthResponse['selectionReason'],
  ): Promise<ProjectHealthResponse> {
    const counts = selectedProjectId
      ? await this.defects.countByProject(personId, selectedProjectId)
      : { total: 0, byStatus: {}, bySeverity: {} };
    const fill = (names: readonly string[], by: Record<string, number>) =>
      names.map((name) => ({ name, count: by[name] ?? 0 }));
    return {
      projects,
      selectedProjectId,
      selectionReason,
      total: counts.total,
      byStatus: fill(DEFECT_STATUSES, counts.byStatus),
      bySeverity: fill(DEFECT_SEVERITIES, counts.bySeverity),
    };
  }
}

const sortByName = (projects: ProjectSummary[]) =>
  [...projects].sort((a, b) => a.name.localeCompare(b.name));
