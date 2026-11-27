import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MyWorkModule } from './my-work/my-work.module';
import { SpendingModule } from './spending/spending.module';

@Module({
  imports: [AuthModule, MyWorkModule, SpendingModule, HealthModule],
})
export class AppModule {}
