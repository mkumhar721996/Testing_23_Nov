import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthClient } from './AuthClient';

/** Mounts children only once someone is signed in; otherwise redirects to Entra ID. */
export function RequireAuth({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.init().then((account) => {
      if (cancelled) return;
      if (account) setSignedIn(true);
      else void client.signIn();
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (!signedIn) {
    return (
      <p role="status" className="text-muted" style={{ padding: 'var(--page-gutter)' }}>
        Signing you in
      </p>
    );
  }
  return <>{children}</>;
}
