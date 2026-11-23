import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { TokenVerifier, VerifiedToken } from './token-verifier';

export class EntraTokenVerifier implements TokenVerifier {
  constructor(
    private readonly opts: { issuer: string; audience: string; jwks: JWTVerifyGetKey },
  ) {}

  async verify(bearer: string): Promise<VerifiedToken> {
    const { payload } = await jwtVerify(bearer, this.opts.jwks, {
      issuer: this.opts.issuer,
      audience: this.opts.audience,
    });
    if (typeof payload.oid !== 'string') throw new Error('token has no oid claim');
    const roles = Array.isArray(payload.roles)
      ? payload.roles.filter((r): r is string => typeof r === 'string')
      : [];
    return {
      oid: payload.oid,
      roles,
      name: typeof payload.name === 'string' ? payload.name : '',
    };
  }
}

/** Builds the verifier from env; with no tenant or audience set, every token is rejected. */
export function entraTokenVerifierFromEnv(): TokenVerifier {
  const tenant = process.env.ENTRA_TENANT_ID;
  const audience = process.env.ENTRA_API_AUDIENCE;
  if (!tenant || !audience) {
    return {
      async verify() {
        throw new Error('ENTRA_TENANT_ID and ENTRA_API_AUDIENCE are not set');
      },
    };
  }
  return new EntraTokenVerifier({
    issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    audience,
    jwks: createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`),
    ),
  });
}
