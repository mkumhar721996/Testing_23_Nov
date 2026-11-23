export interface ExpenseCategory {
  id: string;
  name: string;
  retired: boolean;
}

export const EXPENSE_CATEGORY_REPOSITORY = Symbol('EXPENSE_CATEGORY_REPOSITORY');

/** Thrown by a repository when the case-insensitive unique name rule is hit (also under concurrency). */
export class DuplicateNameError extends Error {}

/** Every write records one audit row with the actor (ADR-0010) in the same transaction. */
export interface ExpenseCategoryRepository {
  list(opts?: { activeOnly?: boolean }): Promise<ExpenseCategory[]>;
  findById(id: string): Promise<ExpenseCategory | null>;
  /** Finds a category by name, ignoring case; `excludeId` skips the category being renamed. */
  findByName(name: string, excludeId?: string): Promise<ExpenseCategory | null>;
  create(name: string, actor: string): Promise<ExpenseCategory>;
  rename(id: string, name: string, actor: string): Promise<ExpenseCategory>;
  retire(id: string, actor: string): Promise<ExpenseCategory>;
}
