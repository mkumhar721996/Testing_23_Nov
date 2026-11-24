import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./dashboard/dashboard-api', () => ({
  fetchDashboard: async () => ({ customer: { name: 'Maya' }, products: [] }),
}));

describe('App', () => {
  it('renders the dashboard greeting', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Good \w+, Maya/);
  });
});
