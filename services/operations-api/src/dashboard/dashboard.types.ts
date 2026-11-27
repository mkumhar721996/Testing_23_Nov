export type Money = { amountMinor: number; currency: string }; // ISO 4217, minor units

export type DashboardStats = { bookings: number; customers: number; earnings: Money };

export type Period = 'weekly' | 'monthly' | 'yearly';

export type RevenuePoint = { label: string; amountMinor: number };
export type RevenueSeries = { period: Period; currency: string; points: RevenuePoint[] };

export type DestinationShare = { name: string; country: string; percent: number; participants: number };
export type TopDestinations = { period: Period; destinations: DestinationShare[] };

// Dates are ISO yyyy-mm-dd strings; the Web App formats them.
export type RecentTrip = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  expenses: Money;
};
export type UpcomingTrip = { id: string; kind: string; destination: string; startDate: string; endDate: string };
export type TravelPackage = { id: string; destination: string; bookings: number; createdAt: string };
export type Message = { id: string; from: string; initials: string; preview: string; unread: number };
export type PackageSort = 'latest' | 'most-booked';
