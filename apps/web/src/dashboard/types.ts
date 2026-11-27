// Mirrors the Operations API contract (services/operations-api/openapi.yaml).
export type Money = { amountMinor: number; currency: string };

export type DashboardStats = { bookings: number; customers: number; earnings: Money };

// start/end are inclusive calendar dates (YYYY-MM-DD) with no time zone.
export type Trip = { id: string; destination: string; type: string; start: string; end: string };

export type MonthTrips = { month: string; trips: Trip[] };
