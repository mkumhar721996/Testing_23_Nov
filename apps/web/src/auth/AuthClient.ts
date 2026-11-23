export interface AuthClient {
  /** Resolves the signed-in person, or null when nobody is signed in. */
  init(): Promise<{ name: string } | null>;
  /** Redirects to the corporate Entra ID sign-in. */
  signIn(): Promise<void>;
  getAccessToken(): Promise<string>;
}
