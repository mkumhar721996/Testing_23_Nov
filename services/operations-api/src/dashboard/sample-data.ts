import type {
  DashboardStats,
  Message,
  RecentTrip,
  TravelPackage,
  UpcomingTrip,
} from './dashboard.types';

export const SAMPLE_STATS: DashboardStats = {
  bookings: 1200,
  customers: 2845,
  earnings: { amountMinor: 1234560, currency: 'USD' }, // $12,345.60, shown as $12,346
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
