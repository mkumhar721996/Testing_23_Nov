import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api/onboarding';
import App from './App';
import type { AuthClient } from './auth/AuthClient';

vi.mock('./api/onboarding');
const mocked = vi.mocked(api);

const fakeClient = (account: { name: string } | null): AuthClient => ({
  init: vi.fn().mockResolvedValue(account),
  signIn: vi.fn().mockResolvedValue(undefined),
  getAccessToken: vi.fn().mockResolvedValue('token'),
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('App', () => {
  it('shows no onboarding data and calls no API before sign-in (AC1)', async () => {
    const client = fakeClient(null);
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <App client={client} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Signing you in');
    expect(client.signIn).toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Onboarding' })).not.toBeInTheDocument();
    expect(mocked.getMe).not.toHaveBeenCalled();
    expect(mocked.listRecords).not.toHaveBeenCalled();
  });

  it('sends / to the onboarding list inside the shell', async () => {
    mocked.getMe.mockResolvedValue({ employeeId: null, displayName: 'Hana Admin', role: 'administrator' });
    mocked.listRecords.mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={['/']}>
        <App client={fakeClient({ name: 'Hana Admin' })} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Onboarding' })).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Hana Admin' })).toHaveTextContent('HA');
    expect(screen.queryByRole('button', { name: /alerts|remind/i })).not.toBeInTheDocument();
  });
});
