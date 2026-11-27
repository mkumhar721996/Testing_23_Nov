import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [AuthModule, DashboardModule, HealthModule, SearchModule],
})
export class AppModule {}
