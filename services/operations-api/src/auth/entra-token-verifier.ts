import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { TokenVerifier } from './token-verifier';

@Injectable()
export class EntraTokenVerifier implements TokenVerifier {
  private readonly audience: string;
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    const tenantId = process.env.ENTRA_TENANT_ID;
    const audience = process.env.ENTRA_API_AUDIENCE;
    if (!tenantId || !audience) {
      throw new Error('ENTRA_TENANT_ID and ENTRA_API_AUDIENCE must be set');
    }
    this.audience = audience;
    this.issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
    this.jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
    );
  }

  async verify(token: string): Promise<{ subject: string }> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
    });
    const subject = typeof payload.oid === 'string' ? payload.oid : payload.sub;
    if (!subject) throw new Error('token has no subject');
    return { subject };
  }
}
