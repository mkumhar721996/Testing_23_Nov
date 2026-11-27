import type { Period, RevenueSeries, TopDestinations } from './types';

const revenue = (period: Period, labels: string[], amounts: number[]): RevenueSeries => ({
  period,
  currency: 'USD',
  points: labels.map((label, i) => ({ label, amountMinor: amounts[i] })),
});

export const revenueByPeriod: Record<Period, RevenueSeries> = {
  weekly: revenue(
    'weekly',
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    [32000, 41000, 38000, 63500, 48000, 52000, 45000],
  ),
  monthly: revenue(
    'monthly',
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    [920000, 1040000, 1180000, 1090000, 1260000, 1310000, 1420000, 1350000, 1210000, 1380000, 1540000, 1690000],
  ),
  yearly: revenue('yearly', ['2023', '2024', '2025', '2026'], [6200000, 8800000, 10400000, 15800000]),
};

const shares = (percents: number[]): TopDestinations['destinations'] =>
  [
    ['Tokyo', 'Japan'],
    ['Sydney', 'Australia'],
    ['Paris', 'France'],
    ['Venice', 'Italy'],
  ].map(([name, country], i) => ({ name, country, percent: percents[i], participants: 1000 * (i + 1) }));

export const destinationsByPeriod: Record<Period, TopDestinations> = {
  weekly: { period: 'weekly', destinations: shares([30, 24, 28, 18]) },
  monthly: { period: 'monthly', destinations: shares([35, 28, 22, 15]) },
  yearly: { period: 'yearly', destinations: shares([38, 26, 21, 15]) },
};
