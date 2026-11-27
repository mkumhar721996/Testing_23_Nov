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
  /** Counts of defects in one project by status and severity; empty when the person is not a member. */
  countByProject(
    personId: string,
    projectId: string,
  ): Promise<{ total: number; byStatus: Record<string, number>; bySeverity: Record<string, number> }>;
  getLastViewedProjectId(personId: string): Promise<string | null>;
  /** Upsert: one row per person. */
  setLastViewedProjectId(personId: string, projectId: string): Promise<void>;
}
