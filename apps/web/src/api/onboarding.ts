import { apiFetch } from './client';

export type Role = 'administrator' | 'manager' | 'employee';
export type Stage = 'before_day_one' | 'first_week';
export type RecordStatus = 'not_started' | 'in_progress' | 'complete';

export interface Me {
  employeeId: string | null;
  displayName: string;
  role: Role;
}

export interface Employee {
  id: string;
  displayName: string;
  jobTitle: string;
  team: string;
}

export interface ChecklistItem {
  id: string;
  stage: Stage;
  title: string;
  ownerName: string;
  done: boolean;
  position: number;
}

export interface RecordSummary {
  id: string;
  employee: { displayName: string; jobTitle: string; team: string };
  startDate: string;
  doneCount: number;
  totalCount: number;
  status: RecordStatus;
}

export interface RecordDetail extends RecordSummary {
  managerName: string | null;
  items: ChecklistItem[];
}

export interface NewItem {
  stage: Stage;
  title: string;
  ownerName: string;
}

export const getMe = () => apiFetch<Me>('/me');
export const listRecords = () => apiFetch<RecordSummary[]>('/onboarding-records');
export const listEmployeesWithoutOnboarding = () => apiFetch<Employee[]>('/employees/without-onboarding');
export const getRecord = (id: string) => apiFetch<RecordDetail>(`/onboarding-records/${id}`);
export const createRecord = (body: { employeeId: string; startDate: string }) =>
  apiFetch<RecordDetail>('/onboarding-records', { method: 'POST', body });
export const updateStartDate = (id: string, startDate: string) =>
  apiFetch<RecordDetail>(`/onboarding-records/${id}`, { method: 'PATCH', body: { startDate } });
export const addItem = (id: string, body: NewItem) =>
  apiFetch<ChecklistItem>(`/onboarding-records/${id}/items`, { method: 'POST', body });
export const setItemDone = (id: string, itemId: string, done: boolean) =>
  apiFetch<ChecklistItem>(`/onboarding-records/${id}/items/${itemId}`, { method: 'PATCH', body: { done } });
