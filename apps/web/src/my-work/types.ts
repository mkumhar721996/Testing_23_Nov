export type DefectSummary = {
  id: string;
  key: string;
  title: string;
  severity: string;
  status: string;
  projectName: string;
  createdByName: string | null;
  updatedAt: string;
};

export type ProjectSummary = { id: string; name: string };

export type MyWorkResponse = {
  openDefects: { items: DefectSummary[]; total: number };
  recentlyUpdated: DefectSummary[];
  hasAnyDefects: boolean;
  projects: ProjectSummary[];
};

export type CountEntry = { name: string; count: number };

export type ProjectHealth = {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectionReason: 'last-viewed' | 'first-visit' | 'fallback' | 'picked' | null;
  total: number;
  byStatus: CountEntry[];
  bySeverity: CountEntry[];
};
