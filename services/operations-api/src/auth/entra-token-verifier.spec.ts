import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { EntraTokenVerifier } from './entra-token-verifier';

const tenant = 'tenant-1';
const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`;
const audience = 'api://onboarding';

let privateKey: CryptoKey;
let verifier: EntraTokenVerifier;

const sign = (claims: Record<string, unknown>, opts: { iss?: string; aud?: string } = {}) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.iss ?? issuer)
    .setAudience(opts.aud ?? audience)
    .setExpirationTime('5m')
    .sign(privateKey);

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' };
  verifier = new EntraTokenVerifier({ issuer, audience, jwks: createLocalJWKSet({ keys: [jwk] }) });
});

describe('EntraTokenVerifier', () => {
  it('maps a valid token to oid, roles and name', async () => {
    const token = await sign({ oid: 'oid-1', roles: ['manager'], name: 'Maya Okafor' });
    expect(await verifier.verify(token)).toEqual({
      oid: 'oid-1',
      roles: ['manager'],
      name: 'Maya Okafor',
    });
  });

  it('rejects a wrong issuer', async () => {
    const token = await sign({ oid: 'o' }, { iss: 'https://evil.example/v2.0' });
    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('rejects a wrong audience', async () => {
    await expect(verifier.verify(await sign({ oid: 'o' }, { aud: 'api://other' }))).rejects.toThrow();
  });

  it('rejects a token without an oid', async () => {
    await expect(verifier.verify(await sign({ roles: ['manager'] }))).rejects.toThrow();
  });

  it('rejects garbage', async () => {
    await expect(verifier.verify('garbage')).rejects.toThrow();
  });
});
