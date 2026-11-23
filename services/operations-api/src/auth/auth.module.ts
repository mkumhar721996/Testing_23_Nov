import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { EntraTokenVerifier } from './entra-token-verifier';
import { PgPrincipalResolver } from './pg-principal-resolver';
import { PRINCIPAL_RESOLVER, TOKEN_VERIFIER } from './principal-resolver';

@Module({
  providers: [
    AuthGuard,
    { provide: TOKEN_VERIFIER, useClass: EntraTokenVerifier },
    { provide: PRINCIPAL_RESOLVER, useClass: PgPrincipalResolver },
  ],
  exports: [AuthGuard, TOKEN_VERIFIER, PRINCIPAL_RESOLVER],
})
export class AuthModule {}
