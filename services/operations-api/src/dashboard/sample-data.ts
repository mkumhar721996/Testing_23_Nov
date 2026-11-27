import type { DashboardStats } from './dashboard.types';

export const SAMPLE_STATS: DashboardStats = {
  bookings: 1200,
  customers: 2845,
  earnings: { amountMinor: 1234560, currency: 'USD' }, // $12,345.60, shown as $12,346
};
