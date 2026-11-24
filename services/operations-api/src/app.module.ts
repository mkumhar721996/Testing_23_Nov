import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [AuthModule, DashboardModule, HealthModule],
})
export class AppModule {}
