// Seam for the Entra ID access token (ADR-0005). Sign-in in the browser is owned by another story;
// until it sets a token provider, requests go out without one and the API answers 401.
type TokenProvider = () => Promise<string | null> | string | null;

let provider: TokenProvider = () => null;

export function setTokenProvider(next: TokenProvider): void {
  provider = next;
}

export async function getAccessToken(): Promise<string | null> {
  return provider();
}
