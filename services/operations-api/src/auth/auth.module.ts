import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OnboardingDataModule } from '../onboarding/onboarding-data.module';
import { AuthGuard } from './auth.guard';
import { entraTokenVerifierFromEnv } from './entra-token-verifier';
import { TOKEN_VERIFIER } from './token-verifier';

@Module({
  imports: [OnboardingDataModule],
  providers: [
    { provide: TOKEN_VERIFIER, useFactory: entraTokenVerifierFromEnv },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
