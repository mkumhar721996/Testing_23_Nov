import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Principal } from '../auth/principal';
import { DuplicateNameError, EXPENSE_CATEGORY_REPOSITORY } from './expense-category.repository';
import type { ExpenseCategory, ExpenseCategoryRepository } from './expense-category.repository';

const nameBlank = () =>
  new BadRequestException({ code: 'name_blank', message: 'Enter a category name.' });
const nameTaken = (name: string) =>
  new ConflictException({ code: 'name_taken', message: `"${name}" already exists. Choose a different name.` });

@Injectable()
export class ExpenseCategoriesService {
  constructor(@Inject(EXPENSE_CATEGORY_REPOSITORY) private readonly repo: ExpenseCategoryRepository) {}

  list(opts: { activeOnly?: boolean } = {}): Promise<ExpenseCategory[]> {
    return this.repo.list(opts);
  }

  /** Includes retired categories, so a past expense keeps showing its category. */
  async get(id: string): Promise<ExpenseCategory> {
    const category = await this.repo.findById(id);
    if (!category) throw this.notFound();
    return category;
  }

  async add(name: string, actor: Principal): Promise<ExpenseCategory> {
    const clean = this.cleanName(name);
    if (await this.repo.findByName(clean)) throw nameTaken(clean);
    return this.guardDuplicate(clean, () => this.repo.create(clean, actor.userId));
  }

  async rename(id: string, name: string, actor: Principal): Promise<ExpenseCategory> {
    const clean = this.cleanName(name);
    const current = await this.get(id);
    if (current.retired) {
      throw new ConflictException({ code: 'category_retired', message: 'A retired category cannot be renamed.' });
    }
    if (await this.repo.findByName(clean, id)) throw nameTaken(clean);
    return this.guardDuplicate(clean, () => this.repo.rename(id, clean, actor.userId));
  }

  async retire(id: string, actor: Principal): Promise<ExpenseCategory> {
    const current = await this.get(id);
    if (current.retired) return current;
    return this.repo.retire(id, actor.userId);
  }

  private cleanName(name: unknown): string {
    const clean = typeof name === 'string' ? name.trim() : '';
    if (!clean) throw nameBlank();
    return clean;
  }

  private async guardDuplicate<T>(name: string, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (err) {
      if (err instanceof DuplicateNameError) throw nameTaken(name);
      throw err;
    }
  }

  private notFound() {
    return new NotFoundException({ code: 'not_found', message: 'That expense category does not exist.' });
  }
}
