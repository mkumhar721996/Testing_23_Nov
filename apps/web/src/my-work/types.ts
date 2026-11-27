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
