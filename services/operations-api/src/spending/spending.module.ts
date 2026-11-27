import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../db/database.module';
import { PgTransactionRepository } from './pg-transaction.repository';
import { SpendingController } from './spending.controller';
import { SpendingService } from './spending.service';
import { TRANSACTION_REPOSITORY } from './transaction.repository';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [SpendingController],
  providers: [SpendingService, { provide: TRANSACTION_REPOSITORY, useClass: PgTransactionRepository }],
})
export class SpendingModule {}
