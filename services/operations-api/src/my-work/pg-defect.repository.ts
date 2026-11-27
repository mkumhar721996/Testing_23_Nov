import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import type { DefectRepository } from './defect.repository';
import type { DefectSummary, ProjectSummary } from './my-work.types';

type DefectRow = {
  id: string;
  key: string;
  title: string;
  severity: string;
  status: string;
  project_name: string;
  created_by_name: string | null;
  updated_at: Date;
};

// Every query joins project_members, so a person only ever sees defects in their own projects.
const SELECT_DEFECTS = `
  SELECT d.id, 'DEF-' || d.number AS key, d.title, d.severity, d.status,
         p.name AS project_name, creator.display_name AS created_by_name, d.updated_at
    FROM defects d
    JOIN projects p ON p.id = d.project_id
    JOIN project_members m ON m.project_id = d.project_id AND m.person_id = $1
    LEFT JOIN people creator ON creator.id = d.created_by`;

const toSummary = (row: DefectRow): DefectSummary => ({
  id: row.id,
  key: row.key,
  title: row.title,
  severity: row.severity,
  status: row.status,
  projectName: row.project_name,
  createdByName: row.created_by_name,
  updatedAt: row.updated_at.toISOString(),
});

@Injectable()
export class PgDefectRepository implements DefectRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findOpenAssigned(personId: string, limit: number) {
    const openAssigned = `d.assignee_id = $1 AND d.status <> 'Closed'`;
    const [items, count] = await Promise.all([
      this.pool.query<DefectRow>(
        `${SELECT_DEFECTS} WHERE ${openAssigned} ORDER BY d.updated_at DESC, d.id DESC LIMIT $2`,
        [personId, limit],
      ),
      this.pool.query<{ total: number }>(
        `SELECT count(*)::int AS total
           FROM defects d
           JOIN project_members m ON m.project_id = d.project_id AND m.person_id = $1
          WHERE ${openAssigned}`,
        [personId],
      ),
    ]);
    return { items: items.rows.map(toSummary), total: count.rows[0].total };
  }

  async findRecentInProjects(personId: string, limit: number) {
    const { rows } = await this.pool.query<DefectRow>(
      `${SELECT_DEFECTS} ORDER BY d.updated_at DESC, d.id DESC LIMIT $2`,
      [personId, limit],
    );
    return rows.map(toSummary);
  }

  async countByProject(personId: string, projectId: string) {
    // Joined to project_members: a non-member gets empty counts.
    const group = async (column: 'status' | 'severity') => {
      const { rows } = await this.pool.query<{ name: string; count: number }>(
        `SELECT d.${column} AS name, count(*)::int AS count
           FROM defects d
           JOIN project_members m ON m.project_id = d.project_id AND m.person_id = $1
          WHERE d.project_id = $2
          GROUP BY d.${column}`,
        [personId, projectId],
      );
      return Object.fromEntries(rows.map((r) => [r.name, r.count]));
    };
    const [byStatus, bySeverity] = await Promise.all([group('status'), group('severity')]);
    const total = Object.values(byStatus).reduce((n, c) => n + c, 0);
    return { total, byStatus, bySeverity };
  }

  async getLastViewedProjectId(personId: string) {
    const { rows } = await this.pool.query<{ project_id: string }>(
      'SELECT project_id FROM project_last_viewed WHERE person_id = $1',
      [personId],
    );
    return rows[0]?.project_id ?? null;
  }

  async setLastViewedProjectId(personId: string, projectId: string) {
    await this.pool.query(
      `INSERT INTO project_last_viewed (person_id, project_id) VALUES ($1, $2)
       ON CONFLICT (person_id) DO UPDATE SET project_id = EXCLUDED.project_id, updated_at = now()`,
      [personId, projectId],
    );
  }

  async findProjects(personId: string): Promise<ProjectSummary[]> {
    const { rows } = await this.pool.query<ProjectSummary>(
      `SELECT p.id, p.name
         FROM projects p
         JOIN project_members m ON m.project_id = p.id AND m.person_id = $1
        ORDER BY p.name`,
      [personId],
    );
    return rows;
  }
}
