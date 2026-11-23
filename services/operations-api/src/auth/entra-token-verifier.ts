import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { TokenVerifier } from './principal-resolver';

/** Verifies Entra ID access tokens (signature, issuer, audience) against the tenant JWKS. */
@Injectable()
export class EntraTokenVerifier implements TokenVerifier {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  async verify(token: string): Promise<string | null> {
    const tenant = process.env.ENTRA_TENANT_ID;
    const audience = process.env.ENTRA_AUDIENCE;
    if (!tenant || !audience) {
      return null;
    }
    this.jwks ??= createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`),
    );
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
        audience,
      });
      return typeof payload.oid === 'string' ? payload.oid : null;
    } catch {
      return null;
    }
  }
}
