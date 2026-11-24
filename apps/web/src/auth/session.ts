// Seam for the signed-in session. Sign-in through Entra ID (ADR-0005) is delivered
// separately and replaces this with the real access-token source.
let tokenSource: () => Promise<string> = async () => '';

export function setAccessTokenSource(source: () => Promise<string>): void {
  tokenSource = source;
}

export function getAccessToken(): Promise<string> {
  return tokenSource();
}
