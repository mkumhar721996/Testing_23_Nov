import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [AuthModule, HealthModule, OnboardingModule],
})
export class AppModule {}
