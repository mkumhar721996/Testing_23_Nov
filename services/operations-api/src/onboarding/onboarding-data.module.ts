import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { DbModule, PG_POOL } from '../db/db.module';
import { ONBOARDING_REPOSITORY } from './onboarding.repository';
import { PgOnboardingRepository } from './pg-onboarding.repository';

@Module({
  imports: [DbModule],
  providers: [
    {
      provide: ONBOARDING_REPOSITORY,
      useFactory: (pool: Pool) => new PgOnboardingRepository(pool),
      inject: [PG_POOL],
    },
  ],
  exports: [ONBOARDING_REPOSITORY],
})
export class OnboardingDataModule {}
