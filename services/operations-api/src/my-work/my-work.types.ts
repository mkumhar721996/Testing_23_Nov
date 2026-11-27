export type DefectSummary = {
  id: string;
  key: string;
  title: string;
  severity: string;
  status: string;
  projectName: string;
  createdByName: string | null;
  updatedAt: string; // ISO 8601
};

export type ProjectSummary = { id: string; name: string };

// Mirror the CHECK constraints in migrations/0001_defects.sql.
export const DEFECT_STATUSES = [
  'New',
  'Open',
  'In Progress',
  'Reopened',
  'Resolved',
  'Closed',
] as const;
export const DEFECT_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export type CountEntry = { name: string; count: number };

export type ProjectHealthResponse = {
  projects: ProjectSummary[]; // only the person's projects, sorted by name
  selectedProjectId: string | null; // null when the person has no project
  selectionReason: 'last-viewed' | 'first-visit' | 'fallback' | 'picked' | null;
  total: number; // defects in the selected project
  byStatus: CountEntry[]; // every status, in DEFECT_STATUSES order, 0 included
  bySeverity: CountEntry[]; // every severity, in DEFECT_SEVERITIES order, 0 included
};

export type MyWorkResponse = {
  openDefects: { items: DefectSummary[]; total: number };
  recentlyUpdated: DefectSummary[];
  hasAnyDefects: boolean;
  projects: ProjectSummary[];
};
