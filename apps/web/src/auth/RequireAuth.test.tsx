import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthClient } from './AuthClient';
import { RequireAuth } from './RequireAuth';

const fakeClient = (account: { name: string } | null): AuthClient => ({
  init: vi.fn().mockResolvedValue(account),
  signIn: vi.fn().mockResolvedValue(undefined),
  getAccessToken: vi.fn().mockResolvedValue('token'),
});

describe('RequireAuth', () => {
  it('sends a visitor who is not signed in to Entra ID and shows no content', async () => {
    const client = fakeClient(null);
    render(
      <RequireAuth client={client}>
        <div>secret onboarding</div>
      </RequireAuth>,
    );
    await waitFor(() => expect(client.signIn).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('secret onboarding')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Signing you in');
  });

  it('shows the content for a signed-in person without redirecting', async () => {
    const client = fakeClient({ name: 'Maya' });
    render(
      <RequireAuth client={client}>
        <div>secret onboarding</div>
      </RequireAuth>,
    );
    expect(await screen.findByText('secret onboarding')).toBeInTheDocument();
    expect(client.signIn).not.toHaveBeenCalled();
  });
});
