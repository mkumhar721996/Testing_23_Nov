import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { EntraTokenVerifier } from './entra-token-verifier';
import { TOKEN_VERIFIER } from './token-verifier';

@Module({
  providers: [{ provide: TOKEN_VERIFIER, useClass: EntraTokenVerifier }, AuthGuard],
  exports: [TOKEN_VERIFIER, AuthGuard],
})
export class AuthModule {}
