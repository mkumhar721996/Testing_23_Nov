import type { Principal } from '../auth/principal';

export type Action = 'read' | 'write';

export interface AccessTarget {
  employeeId: string;
  managerId: string | null;
}

/** The one place that decides who may see or change an onboarding record. */
export function can(p: Principal, action: Action, record: AccessTarget): boolean {
  if (p.role === 'administrator') return true;
  if (action === 'write' || p.employeeId === null) return false;
  if (p.role === 'manager') return record.managerId === p.employeeId;
  return record.employeeId === p.employeeId;
}
