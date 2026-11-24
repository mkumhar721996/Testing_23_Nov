import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PRODUCT_REPOSITORY } from './product.repository';
import { SampleProductRepository } from './sample-product.repository';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    { provide: PRODUCT_REPOSITORY, useClass: SampleProductRepository },
  ],
})
export class DashboardModule {}
