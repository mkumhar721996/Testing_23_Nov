export type Role = 'administrator' | 'manager' | 'employee';

export interface Principal {
  oid: string;
  role: Role;
  employeeId: string | null;
  displayName: string;
}
