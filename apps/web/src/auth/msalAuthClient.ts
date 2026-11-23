import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import type { AuthClient } from './AuthClient';

export function createMsalAuthClient(): AuthClient {
  const scopes = [import.meta.env.VITE_API_SCOPE as string];
  const msal = new PublicClientApplication({
    auth: {
      clientId: import.meta.env.VITE_ENTRA_CLIENT_ID as string,
      authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'sessionStorage' },
  });

  return {
    async init() {
      await msal.initialize();
      const result = await msal.handleRedirectPromise();
      const account = result?.account ?? msal.getAllAccounts()[0];
      if (!account) return null;
      msal.setActiveAccount(account);
      return { name: account.name ?? account.username };
    },
    async signIn() {
      await msal.loginRedirect({ scopes });
    },
    async getAccessToken() {
      const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
      try {
        const result = await msal.acquireTokenSilent({ scopes, account });
        return result.accessToken;
      } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
          await msal.acquireTokenRedirect({ scopes, account });
        }
        throw err;
      }
    },
  };
}
