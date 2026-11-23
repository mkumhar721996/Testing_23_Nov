import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Principal } from '../auth/principal';
import { toDetailDto, toSummaryDto } from './onboarding.dto';
import type { RecordDetailDto, RecordSummaryDto } from './onboarding.dto';
import { can } from './onboarding.access';
import type { Action } from './onboarding.access';
import { ONBOARDING_REPOSITORY } from './onboarding.repository';
import type {
  ChecklistItem,
  Employee,
  NewItem,
  OnboardingRepository,
  RecordDetail,
} from './onboarding.repository';

@Injectable()
export class OnboardingService {
  constructor(@Inject(ONBOARDING_REPOSITORY) private readonly repo: OnboardingRepository) {}

  async listRecords(p: Principal): Promise<RecordSummaryDto[]> {
    const records = await this.repo.listRecords();
    return records.filter((r) => can(p, 'read', r)).map(toSummaryDto);
  }

  async getRecord(p: Principal, id: string): Promise<RecordDetailDto> {
    return toDetailDto(await this.authorised(p, 'read', id));
  }

  async listEmployeesWithoutOnboarding(p: Principal): Promise<Employee[]> {
    this.requireWrite(p);
    return this.repo.listEmployeesWithoutOnboarding();
  }

  async createRecord(
    p: Principal,
    i: { employeeId: string; startDate: string },
  ): Promise<RecordDetailDto> {
    this.requireWrite(p);
    const open = await this.repo.listEmployeesWithoutOnboarding();
    if (!open.some((e) => e.id === i.employeeId)) {
      throw new ConflictException('That employee is unknown or already has an onboarding record');
    }
    return toDetailDto(await this.repo.createRecord(i, actorOf(p)));
  }

  async updateRecord(p: Principal, id: string, i: { startDate: string }): Promise<RecordDetailDto> {
    await this.authorised(p, 'write', id);
    return toDetailDto(await this.repo.updateRecord(id, i, actorOf(p)));
  }

  async addItem(p: Principal, id: string, i: NewItem): Promise<ChecklistItem> {
    await this.authorised(p, 'write', id);
    return this.repo.addItem(id, i, actorOf(p));
  }

  async updateItem(
    p: Principal,
    id: string,
    itemId: string,
    i: Partial<NewItem & { done: boolean }>,
  ): Promise<ChecklistItem> {
    const record = await this.authorised(p, 'write', id);
    if (!record.items.some((x) => x.id === itemId)) throw new NotFoundException();
    return this.repo.updateItem(id, itemId, i, actorOf(p));
  }

  private requireWrite(p: Principal): void {
    if (p.role !== 'administrator') throw new ForbiddenException();
  }

  private async authorised(p: Principal, action: Action, id: string): Promise<RecordDetail> {
    const record = await this.repo.getRecord(id);
    if (!record) throw new NotFoundException();
    if (!can(p, action, record)) throw new ForbiddenException();
    return record;
  }
}

const actorOf = (p: Principal) => ({ oid: p.oid, name: p.displayName });
