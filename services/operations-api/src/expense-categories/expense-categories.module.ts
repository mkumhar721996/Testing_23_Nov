import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';
import { EXPENSE_CATEGORY_REPOSITORY } from './expense-category.repository';
import { PgExpenseCategoryRepository } from './pg-expense-category.repository';

@Module({
  imports: [AuthModule],
  controllers: [ExpenseCategoriesController],
  providers: [
    ExpenseCategoriesService,
    { provide: EXPENSE_CATEGORY_REPOSITORY, useClass: PgExpenseCategoryRepository },
  ],
  exports: [ExpenseCategoriesService],
})
export class ExpenseCategoriesModule {}
