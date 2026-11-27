import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MyWorkModule } from './my-work/my-work.module';

@Module({
  imports: [AuthModule, MyWorkModule, HealthModule],
})
export class AppModule {}
