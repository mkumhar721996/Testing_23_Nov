import { render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import App from './App';
import { makeDashboard } from './dashboard/fixtures';

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('renders the banking dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => makeDashboard() }),
    );
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your accounts' })).toBeInTheDocument();
  });
});
