import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getMe } from './api/onboarding';
import type { Me } from './api/onboarding';
import type { AuthClient } from './auth/AuthClient';
import { RequireAuth } from './auth/RequireAuth';
import { OnboardingDetailPage } from './onboarding/OnboardingDetailPage';
import { OnboardingListPage } from './onboarding/OnboardingListPage';
import { MeContext } from './onboarding/status';
import { AppShell } from './shell/AppShell';

/** Loads who is signed in (role included) before any onboarding screen mounts. */
function Session() {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getMe().then(setMe, () => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="alert alert-danger" role="alert" style={{ margin: 'var(--page-gutter)' }}>
        We couldn't load your account. Reload the page to try again.
      </div>
    );
  }
  if (!me) return <p role="status" className="text-muted" style={{ padding: 'var(--page-gutter)' }}>Loading</p>;

  return (
    <MeContext.Provider value={me}>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingListPage />} />
          <Route path="/onboarding/:id" element={<OnboardingDetailPage />} />
        </Routes>
      </AppShell>
    </MeContext.Provider>
  );
}

export default function App({ client }: { client: AuthClient }) {
  return (
    <RequireAuth client={client}>
      <Session />
    </RequireAuth>
  );
}
