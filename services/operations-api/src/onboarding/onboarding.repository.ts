export type Stage = 'before_day_one' | 'first_week';

export interface Employee {
  id: string;
  entraOid: string | null;
  email: string;
  displayName: string;
  jobTitle: string;
  team: string;
  managerId: string | null;
}

export interface Actor {
  oid: string;
  name: string;
}

export interface ChecklistItem {
  id: string;
  stage: Stage;
  title: string;
  ownerName: string;
  done: boolean;
  position: number;
}

export interface NewItem {
  stage: Stage;
  title: string;
  ownerName: string;
}

/** `employeeId` and `managerId` feed the access policy and never leave the API. */
export interface RecordSummary {
  id: string;
  employeeId: string;
  managerId: string | null;
  employee: { displayName: string; jobTitle: string; team: string };
  startDate: string;
  doneCount: number;
  totalCount: number;
}

export interface RecordDetail extends RecordSummary {
  managerName: string | null;
  items: ChecklistItem[];
}

export type AuditAction = 'record.created' | 'record.updated' | 'item.added' | 'item.updated';

export interface AuditEntry {
  id: number;
  at: string;
  actorOid: string;
  actorName: string;
  action: AuditAction;
  recordId: string;
  before: unknown;
  after: unknown;
}

/** Every write stores its audit entry in the same transaction as the change. */
export interface OnboardingRepository {
  findEmployeeByOid(oid: string): Promise<Employee | null>;
  listEmployeesWithoutOnboarding(): Promise<Employee[]>;
  listRecords(): Promise<RecordSummary[]>;
  getRecord(id: string): Promise<RecordDetail | null>;
  createRecord(i: { employeeId: string; startDate: string }, actor: Actor): Promise<RecordDetail>;
  updateRecord(id: string, i: { startDate: string }, actor: Actor): Promise<RecordDetail>;
  addItem(recordId: string, i: NewItem, actor: Actor): Promise<ChecklistItem>;
  updateItem(
    recordId: string,
    itemId: string,
    i: Partial<NewItem & { done: boolean }>,
    actor: Actor,
  ): Promise<ChecklistItem>;
  listAudit(recordId: string): Promise<AuditEntry[]>;
}

export const ONBOARDING_REPOSITORY = Symbol('ONBOARDING_REPOSITORY');
