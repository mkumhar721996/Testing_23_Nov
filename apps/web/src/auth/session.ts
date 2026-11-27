// Seams for the signed-in session. Sign-in through Entra ID (ADR-0005) is delivered
// separately and replaces these with the real access-token source, sign-out and claims.
let tokenSource: () => Promise<string> = async () => '';

export function setAccessTokenSource(source: () => Promise<string>): void {
  tokenSource = source;
}

export function getAccessToken(): Promise<string> {
  return tokenSource();
}

export interface SessionUser {
  name: string;
  email: string;
  role: string;
}

let signOutHandler: () => Promise<void> = async () => {};
let userSource: () => SessionUser | null = () => null;

export function setSignOutHandler(handler: () => Promise<void>): void {
  signOutHandler = handler;
}

export function signOut(): Promise<void> {
  return signOutHandler();
}

export function setCurrentUserSource(source: () => SessionUser | null): void {
  userSource = source;
}

export function getCurrentUser(): SessionUser | null {
  return userSource();
}
