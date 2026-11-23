import type { Pool, PoolClient } from 'pg';
import type {
  Actor,
  AuditAction,
  AuditEntry,
  ChecklistItem,
  Employee,
  NewItem,
  OnboardingRepository,
  RecordDetail,
  RecordSummary,
} from './onboarding.repository';

const EMPLOYEE_COLUMNS = `id, entra_oid AS "entraOid", email, display_name AS "displayName",
  job_title AS "jobTitle", team, manager_id AS "managerId"`;

const ITEM_COLUMNS = `id, stage, title, owner_name AS "ownerName", done, position`;

const SUMMARY_SELECT = `
  SELECT r.id, r.employee_id AS "employeeId", e.manager_id AS "managerId",
         jsonb_build_object('displayName', e.display_name, 'jobTitle', e.job_title, 'team', e.team) AS employee,
         to_char(r.start_date, 'YYYY-MM-DD') AS "startDate",
         count(i.id) FILTER (WHERE i.done)::int AS "doneCount",
         count(i.id)::int AS "totalCount"
    FROM onboarding_records r
    JOIN employees e ON e.id = r.employee_id
    LEFT JOIN checklist_items i ON i.record_id = r.id`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUMMARY_GROUP = `GROUP BY r.id, e.id`;

export class PgOnboardingRepository implements OnboardingRepository {
  constructor(private readonly pool: Pool) {}

  async findEmployeeByOid(oid: string): Promise<Employee | null> {
    const { rows } = await this.pool.query(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE entra_oid = $1`,
      [oid],
    );
    return rows[0] ?? null;
  }

  async listEmployeesWithoutOnboarding(): Promise<Employee[]> {
    const { rows } = await this.pool.query(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees
        WHERE id NOT IN (SELECT employee_id FROM onboarding_records)
        ORDER BY display_name`,
    );
    return rows;
  }

  async listRecords(): Promise<RecordSummary[]> {
    const { rows } = await this.pool.query(
      `${SUMMARY_SELECT} ${SUMMARY_GROUP} ORDER BY r.start_date, e.display_name`,
    );
    return rows;
  }

  async getRecord(id: string): Promise<RecordDetail | null> {
    return this.readRecord(this.pool, id);
  }

  async createRecord(
    i: { employeeId: string; startDate: string },
    actor: Actor,
  ): Promise<RecordDetail> {
    return this.inTransaction(async (db) => {
      const { rows } = await db.query(
        `INSERT INTO onboarding_records (employee_id, start_date) VALUES ($1, $2) RETURNING id`,
        [i.employeeId, i.startDate],
      );
      const id: string = rows[0].id;
      await this.audit(db, actor, 'record.created', id, null, { startDate: i.startDate });
      return (await this.readRecord(db, id))!;
    });
  }

  async updateRecord(id: string, i: { startDate: string }, actor: Actor): Promise<RecordDetail> {
    return this.inTransaction(async (db) => {
      const before = await db.query(
        `SELECT to_char(start_date, 'YYYY-MM-DD') AS "startDate" FROM onboarding_records WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!before.rows[0]) throw new Error(`onboarding record ${id} not found`);
      await db.query(`UPDATE onboarding_records SET start_date = $2 WHERE id = $1`, [
        id,
        i.startDate,
      ]);
      await this.audit(db, actor, 'record.updated', id, before.rows[0], { startDate: i.startDate });
      return (await this.readRecord(db, id))!;
    });
  }

  async addItem(recordId: string, i: NewItem, actor: Actor): Promise<ChecklistItem> {
    return this.inTransaction(async (db) => {
      const { rows } = await db.query(
        `INSERT INTO checklist_items (record_id, stage, title, owner_name, position)
         VALUES ($1, $2, $3, $4,
                 COALESCE((SELECT max(position) + 1 FROM checklist_items WHERE record_id = $1), 0))
         RETURNING ${ITEM_COLUMNS}`,
        [recordId, i.stage, i.title, i.ownerName],
      );
      await this.audit(db, actor, 'item.added', recordId, null, rows[0]);
      return rows[0];
    });
  }

  async updateItem(
    recordId: string,
    itemId: string,
    i: Partial<NewItem & { done: boolean }>,
    actor: Actor,
  ): Promise<ChecklistItem> {
    return this.inTransaction(async (db) => {
      const before = await db.query(
        `SELECT ${ITEM_COLUMNS} FROM checklist_items WHERE id = $1 AND record_id = $2 FOR UPDATE`,
        [itemId, recordId],
      );
      if (!before.rows[0]) throw new Error(`checklist item ${itemId} not found`);
      const next = { ...before.rows[0], ...i };
      const { rows } = await db.query(
        `UPDATE checklist_items SET stage = $2, title = $3, owner_name = $4, done = $5
          WHERE id = $1 RETURNING ${ITEM_COLUMNS}`,
        [itemId, next.stage, next.title, next.ownerName, next.done],
      );
      await this.audit(db, actor, 'item.updated', recordId, before.rows[0], rows[0]);
      return rows[0];
    });
  }

  async listAudit(recordId: string): Promise<AuditEntry[]> {
    const { rows } = await this.pool.query(
      `SELECT id::int, at, actor_oid AS "actorOid", actor_name AS "actorName", action,
              record_id AS "recordId", before, after
         FROM audit_log WHERE record_id = $1 ORDER BY id`,
      [recordId],
    );
    return rows.map((r) => ({ ...r, at: new Date(r.at).toISOString() }));
  }

  private async readRecord(
    db: Pick<Pool, 'query'>,
    id: string,
  ): Promise<RecordDetail | null> {
    if (!UUID.test(id)) return null;
    const { rows } = await db.query(
      `SELECT s.*, m.display_name AS "managerName"
         FROM (${SUMMARY_SELECT} WHERE r.id = $1 ${SUMMARY_GROUP}) s
         JOIN employees e ON e.id = s."employeeId"
         LEFT JOIN employees m ON m.id = e.manager_id`,
      [id],
    );
    if (!rows[0]) return null;
    const items = await db.query(
      `SELECT ${ITEM_COLUMNS} FROM checklist_items WHERE record_id = $1 ORDER BY position`,
      [id],
    );
    return { ...rows[0], items: items.rows };
  }

  private async audit(
    db: PoolClient,
    actor: Actor,
    action: AuditAction,
    recordId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await db.query(
      `INSERT INTO audit_log (actor_oid, actor_name, action, record_id, before, after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actor.oid, actor.name, action, recordId, JSON.stringify(before), JSON.stringify(after)],
    );
  }

  private async inTransaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const result = await work(db);
      await db.query('COMMIT');
      return result;
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    } finally {
      db.release();
    }
  }
}
