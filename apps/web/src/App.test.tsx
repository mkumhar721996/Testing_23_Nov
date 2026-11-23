import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./organizations/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./organizations/api')>()),
  fetchOrganizations: vi.fn().mockResolvedValue([]),
  fetchOrganization: vi.fn(),
}));

describe('App', () => {
  it('renders the Organizations page in the app shell', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Organizations' })).toBeInTheDocument();
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText('No organizations found')).toBeInTheDocument();
  });
});
