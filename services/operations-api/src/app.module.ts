import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';

// The orders routes identify the caller by a client-supplied header, which is not real
// access control. Keep them off until Entra ID sign-in (ADR-0005) and a verifying guard
// exist; ORDERS_API_ENABLED=true is for local development only.
export const ordersApiEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.ORDERS_API_ENABLED === 'true';

@Module({
  imports: [HealthModule, ...(ordersApiEnabled() ? [OrdersModule] : [])],
})
export class AppModule {}
