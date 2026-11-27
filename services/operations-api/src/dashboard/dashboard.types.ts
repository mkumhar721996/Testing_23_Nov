export type Money = { amountMinor: number; currency: string }; // ISO 4217, minor units

export type DashboardStats = { bookings: number; customers: number; earnings: Money };

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

// start/end are inclusive calendar dates (YYYY-MM-DD) with no time zone.
export type Trip = { id: string; destination: string; type: string; start: string; end: string };

export type MonthTrips = { month: string; trips: Trip[] }; // month: YYYY-MM
