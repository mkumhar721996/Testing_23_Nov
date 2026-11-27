import type { DefectSummary, ProjectSummary } from './my-work.types';

export const DEFECT_REPOSITORY = Symbol('DEFECT_REPOSITORY');

export interface DefectRepository {
  /** Defects assigned to the person in their projects, status not Closed; newest modified first. */
  findOpenAssigned(
    personId: string,
    limit: number,
  ): Promise<{ items: DefectSummary[]; total: number }>;
  /** Most recently modified defects across the person's projects, Closed included. */
  findRecentInProjects(personId: string, limit: number): Promise<DefectSummary[]>;
  findProjects(personId: string): Promise<ProjectSummary[]>;
}
