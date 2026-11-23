import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../db/database.module';
import { DuplicateNameError } from './expense-category.repository';
import type { ExpenseCategory, ExpenseCategoryRepository } from './expense-category.repository';

const COLUMNS = 'id, name, (retired_at is not null) as retired';
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class PgExpenseCategoryRepository implements ExpenseCategoryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(opts: { activeOnly?: boolean } = {}): Promise<ExpenseCategory[]> {
    const where = opts.activeOnly ? 'where retired_at is null' : '';
    const res = await this.pool.query(`select ${COLUMNS} from expense_categories ${where} order by created_at, name`);
    return res.rows;
  }

  async findById(id: string): Promise<ExpenseCategory | null> {
    if (!isUuid(id)) return null;
    const res = await this.pool.query(`select ${COLUMNS} from expense_categories where id = $1`, [id]);
    return res.rows[0] ?? null;
  }

  async findByName(name: string, excludeId?: string): Promise<ExpenseCategory | null> {
    const res = await this.pool.query(
      `select ${COLUMNS} from expense_categories where lower(name) = lower($1) and ($2::uuid is null or id <> $2::uuid)`,
      [name, excludeId ?? null],
    );
    return res.rows[0] ?? null;
  }

  create(name: string, actor: string): Promise<ExpenseCategory> {
    return this.write('add', actor, (db) =>
      db.query(`insert into expense_categories (name) values ($1) returning ${COLUMNS}`, [name]),
    );
  }

  rename(id: string, name: string, actor: string): Promise<ExpenseCategory> {
    return this.write('rename', actor, (db) =>
      db.query(`update expense_categories set name = $2, updated_at = now() where id = $1 returning ${COLUMNS}`, [id, name]),
    );
  }

  retire(id: string, actor: string): Promise<ExpenseCategory> {
    return this.write('retire', actor, (db) =>
      db.query(
        `update expense_categories set retired_at = coalesce(retired_at, now()), updated_at = now()
         where id = $1 returning ${COLUMNS}`,
        [id],
      ),
    );
  }

  /** Runs the change and its audit row in one transaction. */
  private async write(
    action: string,
    actor: string,
    change: (db: PoolClient) => Promise<{ rows: ExpenseCategory[] }>,
  ): Promise<ExpenseCategory> {
    const db = await this.pool.connect();
    try {
      await db.query('begin');
      const category = (await change(db)).rows[0];
      await db.query(
        'insert into expense_category_audit (category_id, action, actor, detail) values ($1, $2, $3, $4)',
        [category.id, action, actor, JSON.stringify({ name: category.name })],
      );
      await db.query('commit');
      return category;
    } catch (err) {
      await db.query('rollback');
      if ((err as { code?: string }).code === UNIQUE_VIOLATION) throw new DuplicateNameError();
      throw err;
    } finally {
      db.release();
    }
  }
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
