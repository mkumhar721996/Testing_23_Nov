import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthGuard } from './auth.guard';
import { NoPrincipalResolver, PRINCIPAL_RESOLVER } from './principal';

@Module({
  providers: [AuthGuard, AdminGuard, { provide: PRINCIPAL_RESOLVER, useClass: NoPrincipalResolver }],
  exports: [AuthGuard, AdminGuard, PRINCIPAL_RESOLVER],
})
export class AuthModule {}
