import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { ChecklistItem, RecordDetail, RecordSummary } from './onboarding.repository';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)), 'not a real date');
const stage = z.enum(['before_day_one', 'first_week']);
const title = z.string().trim().min(1).max(200);
const ownerName = z.string().trim().max(200);

export const createRecordBody = z.object({ employeeId: z.string().min(1), startDate: isoDate });
export const updateRecordBody = z.object({ startDate: isoDate });
export const addItemBody = z.object({ stage, title, ownerName: ownerName.default('') });
export const updateItemBody = z
  .object({ done: z.boolean(), title, stage, ownerName })
  .partial()
  .refine((b) => Object.keys(b).length > 0, 'nothing to change');

/** Validates a request body; a failure is a 400 that names the offending fields. */
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Invalid request',
      fields: Object.fromEntries(result.error.issues.map((i) => [i.path.join('.') || '_', i.message])),
    });
  }
  return result.data;
}

export type RecordStatus = 'not_started' | 'in_progress' | 'complete';

export interface RecordSummaryDto {
  id: string;
  employee: { displayName: string; jobTitle: string; team: string };
  startDate: string;
  doneCount: number;
  totalCount: number;
  status: RecordStatus;
}

export interface RecordDetailDto extends RecordSummaryDto {
  managerName: string | null;
  items: ChecklistItem[];
}

/** Status comes from item counts only; there is no date logic. */
function statusOf(r: RecordSummary): RecordStatus {
  if (r.doneCount === 0) return 'not_started';
  return r.doneCount === r.totalCount ? 'complete' : 'in_progress';
}

export function toSummaryDto(r: RecordSummary): RecordSummaryDto {
  return {
    id: r.id,
    employee: r.employee,
    startDate: r.startDate,
    doneCount: r.doneCount,
    totalCount: r.totalCount,
    status: statusOf(r),
  };
}

export function toDetailDto(r: RecordDetail): RecordDetailDto {
  return { ...toSummaryDto(r), managerName: r.managerName, items: r.items };
}
