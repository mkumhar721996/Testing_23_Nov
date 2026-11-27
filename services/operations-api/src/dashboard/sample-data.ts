import type { DashboardStats, DestinationShare, Period, RevenuePoint } from './dashboard.types';

export const SAMPLE_STATS: DashboardStats = {
  bookings: 1200,
  customers: 2845,
  earnings: { amountMinor: 1234560, currency: 'USD' }, // $12,345.60, shown as $12,346
};

export const SAMPLE_CURRENCY = 'USD';

const series = (labels: string[], amountsMinor: number[]): RevenuePoint[] =>
  labels.map((label, i) => ({ label, amountMinor: amountsMinor[i] }));

export const SAMPLE_REVENUE: Record<Period, RevenuePoint[]> = {
  weekly: series(
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    [32000, 41000, 38000, 63500, 48000, 52000, 45000],
  ),
  monthly: series(
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    [920000, 1040000, 1180000, 1090000, 1260000, 1310000, 1420000, 1350000, 1210000, 1380000, 1540000, 1690000],
  ),
  yearly: series(
    ['2023', '2024', '2025', '2026', '2027', '2028'],
    [6200000, 8800000, 10400000, 12100000, 13900000, 15800000],
  ),
};

const destination = (
  name: string,
  country: string,
  percent: number,
  participants: number,
): DestinationShare => ({ name, country, percent, participants });

export const SAMPLE_DESTINATIONS: Record<Period, DestinationShare[]> = {
  weekly: [
    destination('Tokyo', 'Japan', 30, 312),
    destination('Sydney', 'Australia', 24, 249),
    destination('Paris', 'France', 28, 291),
    destination('Venice', 'Italy', 18, 187),
  ],
  monthly: [
    destination('Tokyo', 'Japan', 35, 2458),
    destination('Sydney', 'Australia', 28, 1966),
    destination('Paris', 'France', 22, 1545),
    destination('Venice', 'Italy', 15, 1053),
  ],
  yearly: [
    destination('Tokyo', 'Japan', 38, 29840),
    destination('Sydney', 'Australia', 26, 20412),
    destination('Paris', 'France', 21, 16488),
    destination('Venice', 'Italy', 15, 11776),
  ],
};
