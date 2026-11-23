export interface VerifiedToken {
  oid: string;
  roles: string[];
  name: string;
}

export interface TokenVerifier {
  /** Resolves for a valid Entra ID access token, rejects for anything else. */
  verify(bearer: string): Promise<VerifiedToken>;
}

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
