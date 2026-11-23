import { randomUUID } from 'node:crypto';
import { DuplicateNameError } from './expense-category.repository';
import type { ExpenseCategory, ExpenseCategoryRepository } from './expense-category.repository';

export interface AuditRow {
  categoryId: string;
  action: 'add' | 'rename' | 'retire';
  actor: string;
}

/** Test double and local-dev store with the same rules as the Postgres repository. */
export class InMemoryExpenseCategoryRepository implements ExpenseCategoryRepository {
  readonly audit: AuditRow[] = [];
  private rows: ExpenseCategory[];

  constructor(seed: readonly string[] = []) {
    this.rows = seed.map((name) => ({ id: randomUUID(), name, retired: false }));
  }

  async list(opts: { activeOnly?: boolean } = {}) {
    return this.rows.filter((r) => !opts.activeOnly || !r.retired).map((r) => ({ ...r }));
  }

  async findById(id: string) {
    const row = this.rows.find((r) => r.id === id);
    return row ? { ...row } : null;
  }

  async findByName(name: string, excludeId?: string) {
    const row = this.rows.find((r) => r.id !== excludeId && r.name.toLowerCase() === name.toLowerCase());
    return row ? { ...row } : null;
  }

  async create(name: string, actor: string) {
    if (await this.findByName(name)) throw new DuplicateNameError();
    const row = { id: randomUUID(), name, retired: false };
    this.rows.push(row);
    this.audit.push({ categoryId: row.id, action: 'add', actor });
    return { ...row };
  }

  async rename(id: string, name: string, actor: string) {
    if (await this.findByName(name, id)) throw new DuplicateNameError();
    const row = this.mustFind(id);
    row.name = name;
    this.audit.push({ categoryId: id, action: 'rename', actor });
    return { ...row };
  }

  async retire(id: string, actor: string) {
    const row = this.mustFind(id);
    row.retired = true;
    this.audit.push({ categoryId: id, action: 'retire', actor });
    return { ...row };
  }

  private mustFind(id: string) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`No category ${id}`);
    return row;
  }
}
