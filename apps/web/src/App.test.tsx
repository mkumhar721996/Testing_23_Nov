import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./dashboard/dashboard-api', () => ({
  fetchDashboardStats: async () => ({
    bookings: 1200,
    customers: 2845,
    earnings: { amountMinor: 1234560, currency: 'USD' },
  }),
}));

describe('App', () => {
  it('renders the travel dashboard', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });
});
