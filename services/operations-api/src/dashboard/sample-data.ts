import type {
  DashboardStats,
  DestinationShare,
  Message,
  Period,
  RecentTrip,
  RevenuePoint,
  TravelPackage,
  UpcomingTrip,
} from './dashboard.types';

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

// Newest first.
export const SAMPLE_RECENT_TRIPS: RecentTrip[] = [
  {
    id: 'rt-sydney',
    destination: 'Sydney, Australia',
    startDate: '2026-06-02',
    endDate: '2026-06-09',
    travelers: 2458,
    expenses: { amountMinor: 218000, currency: 'USD' },
  },
  {
    id: 'rt-venice',
    destination: 'Venice, Italy',
    startDate: '2026-05-14',
    endDate: '2026-05-20',
    travelers: 1020,
    expenses: { amountMinor: 176000, currency: 'USD' },
  },
  {
    id: 'rt-paris',
    destination: 'Paris, France',
    startDate: '2026-04-22',
    endDate: '2026-04-28',
    travelers: 845,
    expenses: { amountMinor: 154000, currency: 'USD' },
  },
];

export const SAMPLE_UPCOMING_TRIPS: UpcomingTrip[] = [
  {
    id: 'ut-paris',
    kind: 'Romantic getaway',
    destination: 'Paris, France',
    startDate: '2028-07-05',
    endDate: '2028-07-10',
  },
  {
    id: 'ut-tokyo',
    kind: 'Cultural exploration',
    destination: 'Tokyo, Japan',
    startDate: '2028-07-12',
    endDate: '2028-07-19',
  },
];

export const SAMPLE_PACKAGES: TravelPackage[] = [
  { id: 'pk-paris', destination: 'Paris, France', bookings: 320, createdAt: '2026-05-30' },
  { id: 'pk-tokyo', destination: 'Tokyo, Japan', bookings: 410, createdAt: '2026-05-12' },
  { id: 'pk-sydney', destination: 'Sydney, Australia', bookings: 275, createdAt: '2026-04-18' },
];

export const SAMPLE_MESSAGES: Message[] = [
  { id: 'm-europia', from: 'Europia Hotel', initials: 'EH', preview: 'We are pleased to announce…', unread: 1 },
  { id: 'm-global', from: 'Global Travel Co', initials: 'GT', preview: 'We have updated our com…', unread: 3 },
];
