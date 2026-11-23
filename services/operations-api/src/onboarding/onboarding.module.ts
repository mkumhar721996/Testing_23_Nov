import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { OnboardingDataModule } from './onboarding-data.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [OnboardingDataModule],
  controllers: [OnboardingController, MeController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
