import { describe, expect, it } from 'vitest';
import type { Principal } from '../auth/principal';
import { can } from './onboarding.access';

const rec = { employeeId: 'emp-a', managerId: 'mgr-1' };
const person = (role: Principal['role'], employeeId: string | null): Principal => ({
  oid: 'oid',
  role,
  employeeId,
  displayName: 'Test',
});

describe('can', () => {
  it('lets an administrator read and write any record', () => {
    const admin = person('administrator', null);
    expect(can(admin, 'read', rec)).toBe(true);
    expect(can(admin, 'write', rec)).toBe(true);
  });

  it('lets a manager read only a direct report, never write', () => {
    expect(can(person('manager', 'mgr-1'), 'read', rec)).toBe(true);
    expect(can(person('manager', 'mgr-1'), 'write', rec)).toBe(false);
    expect(can(person('manager', 'mgr-2'), 'read', rec)).toBe(false);
    expect(can(person('manager', null), 'read', { ...rec, managerId: null })).toBe(false);
  });

  it('lets an employee read only their own record, never write', () => {
    expect(can(person('employee', 'emp-a'), 'read', rec)).toBe(true);
    expect(can(person('employee', 'emp-a'), 'write', rec)).toBe(false);
    expect(can(person('employee', 'emp-b'), 'read', rec)).toBe(false);
    expect(can(person('employee', null), 'read', rec)).toBe(false);
  });
});
