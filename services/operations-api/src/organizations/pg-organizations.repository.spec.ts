import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PgOrganizationsRepository } from './pg-organizations.repository';

const row = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Org A',
  address: '114 Mill Street, Leeds',
  admin: 'Sam Lee',
  created_by: 'Sam Patel',
};

const poolReturning = (rows: unknown[]) => {
  const query = vi.fn().mockResolvedValue({ rows });
  return { pool: { query } as unknown as Pool, query };
};

describe('PgOrganizationsRepository', () => {
  it('lists every organization with no parameters when unscoped', async () => {
    const { pool, query } = poolReturning([row]);
    const result = await new PgOrganizationsRepository(pool).list({ organizationId: null });
    expect(query.mock.calls[0][1]).toEqual([null]);
    expect(result).toEqual([
      { id: row.id, name: 'Org A', address: row.address, admin: 'Sam Lee', createdBy: 'Sam Patel' },
    ]);
  });

  it('passes the organization id as a query parameter', async () => {
    const { pool, query } = poolReturning([row]);
    await new PgOrganizationsRepository(pool).list({ organizationId: row.id });
    expect(query.mock.calls[0][1]).toEqual([row.id]);
    expect(query.mock.calls[0][0]).not.toContain(row.id);
  });

  it('maps a detail row with null contact fields to null, not empty strings', async () => {
    const { pool } = poolReturning([
      { ...row, consultant_name: 'Jane Doe', consultant_email: null, consultant_phone: null },
    ]);
    const detail = await new PgOrganizationsRepository(pool).findById(row.id);
    expect(detail?.consultant).toEqual({ fullName: 'Jane Doe', email: null, phone: null });
  });

  it('maps no consultant to null', async () => {
    const { pool } = poolReturning([
      { ...row, consultant_name: null, consultant_email: null, consultant_phone: null },
    ]);
    expect((await new PgOrganizationsRepository(pool).findById(row.id))?.consultant).toBeNull();
  });

  it('returns null when the organization does not exist', async () => {
    const { pool } = poolReturning([]);
    expect(await new PgOrganizationsRepository(pool).findById(row.id)).toBeNull();
  });
});
