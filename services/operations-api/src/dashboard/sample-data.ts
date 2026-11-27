import type {
  DashboardStats,
  Message,
  RecentTrip,
  Trip,
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

// Months are offsets from the current month, so the calendar always opens on a month with trips:
// offset 0 holds three trips (two start on the same day) and one that runs into the next month,
// offset 1 holds two, and offset 2 onwards holds none.
type TripTemplate = Omit<Trip, 'start' | 'end'> & {
  start: [monthOffset: number, day: number];
  end: [monthOffset: number, day: number];
};

export const SAMPLE_TRIPS: TripTemplate[] = [
  { id: 'trip-01', destination: 'Rome, Italy', type: 'City break', start: [-5, 10], end: [-5, 15] },
  { id: 'trip-02', destination: 'Tokyo, Japan', type: 'Cultural exploration', start: [-4, 3], end: [-4, 10] },
  { id: 'trip-03', destination: 'Paris, France', type: 'Romantic getaway', start: [-3, 22], end: [-3, 28] },
  { id: 'trip-04', destination: 'Venice, Italy', type: 'Waterfront escape', start: [-2, 14], end: [-2, 20] },
  { id: 'trip-05', destination: 'Sydney, Australia', type: 'Beach holiday', start: [-1, 2], end: [-1, 9] },
  { id: 'trip-06', destination: 'Paris, France', type: 'Romantic getaway', start: [0, 5], end: [0, 10] },
  { id: 'trip-07', destination: 'Tokyo, Japan', type: 'Cultural exploration', start: [0, 12], end: [0, 19] },
  { id: 'trip-08', destination: 'Lisbon, Portugal', type: 'Food and wine tour', start: [0, 12], end: [0, 13] },
  { id: 'trip-09', destination: 'Venice, Italy', type: 'Waterfront escape', start: [0, 28], end: [1, 3] },
  { id: 'trip-10', destination: 'Sydney, Australia', type: 'Beach holiday', start: [1, 21], end: [1, 27] },
];
