import { randomUUID } from 'node:crypto';
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

interface StoredRecord {
  id: string;
  employeeId: string;
  startDate: string;
  items: ChecklistItem[];
}

/** Same contract as the Postgres repository, for tests that need no database. */
export class InMemoryOnboardingRepository implements OnboardingRepository {
  private readonly records: StoredRecord[] = [];
  private readonly audit: AuditEntry[] = [];

  constructor(private readonly employees: Employee[] = []) {}

  async findEmployeeByOid(oid: string): Promise<Employee | null> {
    return this.employees.find((e) => e.entraOid === oid) ?? null;
  }

  async listEmployeesWithoutOnboarding(): Promise<Employee[]> {
    return this.employees.filter((e) => !this.records.some((r) => r.employeeId === e.id));
  }

  async listRecords(): Promise<RecordSummary[]> {
    return this.records.map((r) => this.detail(r));
  }

  async getRecord(id: string): Promise<RecordDetail | null> {
    const rec = this.records.find((r) => r.id === id);
    return rec ? this.detail(rec) : null;
  }

  async createRecord(
    i: { employeeId: string; startDate: string },
    actor: Actor,
  ): Promise<RecordDetail> {
    if (this.records.some((r) => r.employeeId === i.employeeId)) {
      throw new Error('employee already has an onboarding record');
    }
    const rec: StoredRecord = { id: randomUUID(), ...i, items: [] };
    this.records.push(rec);
    this.log(actor, 'record.created', rec.id, null, { startDate: i.startDate });
    return this.detail(rec);
  }

  async updateRecord(id: string, i: { startDate: string }, actor: Actor): Promise<RecordDetail> {
    const rec = this.find(id);
    const before = { startDate: rec.startDate };
    rec.startDate = i.startDate;
    this.log(actor, 'record.updated', id, before, { startDate: i.startDate });
    return this.detail(rec);
  }

  async addItem(recordId: string, i: NewItem, actor: Actor): Promise<ChecklistItem> {
    const rec = this.find(recordId);
    const item: ChecklistItem = { id: randomUUID(), ...i, done: false, position: rec.items.length };
    rec.items.push(item);
    this.log(actor, 'item.added', recordId, null, { ...item });
    return { ...item };
  }

  async updateItem(
    recordId: string,
    itemId: string,
    i: Partial<NewItem & { done: boolean }>,
    actor: Actor,
  ): Promise<ChecklistItem> {
    const item = this.find(recordId).items.find((x) => x.id === itemId);
    if (!item) throw new Error(`checklist item ${itemId} not found`);
    const before = { ...item };
    Object.assign(item, i);
    this.log(actor, 'item.updated', recordId, before, { ...item });
    return { ...item };
  }

  async listAudit(recordId: string): Promise<AuditEntry[]> {
    return this.audit.filter((a) => a.recordId === recordId);
  }

  private find(id: string): StoredRecord {
    const rec = this.records.find((r) => r.id === id);
    if (!rec) throw new Error(`onboarding record ${id} not found`);
    return rec;
  }

  private detail(rec: StoredRecord): RecordDetail {
    const employee = this.employees.find((e) => e.id === rec.employeeId)!;
    const manager = this.employees.find((e) => e.id === employee.managerId);
    return {
      id: rec.id,
      employeeId: employee.id,
      managerId: employee.managerId,
      employee: { displayName: employee.displayName, jobTitle: employee.jobTitle, team: employee.team },
      startDate: rec.startDate,
      doneCount: rec.items.filter((x) => x.done).length,
      totalCount: rec.items.length,
      managerName: manager?.displayName ?? null,
      items: rec.items.map((x) => ({ ...x })),
    };
  }

  private log(
    actor: Actor,
    action: AuditAction,
    recordId: string,
    before: unknown,
    after: unknown,
  ): void {
    this.audit.push({
      id: this.audit.length + 1,
      at: new Date().toISOString(),
      actorOid: actor.oid,
      actorName: actor.name,
      action,
      recordId,
      before,
      after,
    });
  }
}
