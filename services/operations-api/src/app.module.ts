import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [DatabaseModule, HealthModule, ExpenseCategoriesModule],
})
export class AppModule {}
