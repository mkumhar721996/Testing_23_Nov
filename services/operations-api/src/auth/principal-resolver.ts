import type { Principal } from '../organizations/organization.types';

export const PRINCIPAL_RESOLVER = Symbol('PRINCIPAL_RESOLVER');
export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

/** Looks up the user for a verified Entra ID object id. */
export interface PrincipalResolver {
  resolve(entraObjectId: string): Promise<Principal | null>;
}

/** Verifies a bearer token and returns the Entra ID object id (`oid`) it carries. */
export interface TokenVerifier {
  verify(token: string): Promise<string | null>;
}
