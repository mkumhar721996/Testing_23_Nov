import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../db/database.module';
import { DEFECT_REPOSITORY } from './defect.repository';
import { MyWorkController } from './my-work.controller';
import { MyWorkService } from './my-work.service';
import { PgDefectRepository } from './pg-defect.repository';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MyWorkController],
  providers: [MyWorkService, { provide: DEFECT_REPOSITORY, useClass: PgDefectRepository }],
})
export class MyWorkModule {}
