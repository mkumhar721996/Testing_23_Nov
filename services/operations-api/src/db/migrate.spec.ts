import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigrations } from './migrate';

const dir = join(__dirname, '../../migrations');

function fakeDb() {
  const applied = new Set<string>();
  const ran: string[] = [];
  return {
    ran,
    async query(sql: string, params?: unknown[]) {
      if (/select name from schema_migrations/i.test(sql)) return { rows: [...applied].map((name) => ({ name })) };
      if (/insert into schema_migrations/i.test(sql)) applied.add(String(params?.[0]));
      else if (!/^(begin|commit|rollback|create table if not exists schema_migrations)/i.test(sql.trim())) ran.push(sql);
      return { rows: [] };
    },
  };
}

describe('migrations', () => {
  it('AC7 seed is an idempotent insert', () => {
    const sql = readFileSync(join(dir, '0001_expense_categories.sql'), 'utf8');
    expect(sql).toMatch(/insert into expense_categories/i);
    expect(sql).toMatch(/on conflict \(lower\(name\)\) do nothing/i);
    expect(sql).toMatch(/create unique index[^;]*lower\(name\)/i);
  });

  it('applies each migration once', async () => {
    const db = fakeDb();
    expect(await applyMigrations(db, dir)).toEqual(['0001_expense_categories.sql']);
    expect(db.ran).toHaveLength(1);
    expect(await applyMigrations(db, dir)).toEqual([]);
    expect(db.ran).toHaveLength(1);
  });
});
