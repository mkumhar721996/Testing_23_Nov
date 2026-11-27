// Mirrors the Operations API contract (services/operations-api/openapi.yaml).
export type Money = { amountMinor: number; currency: string };

export type DashboardStats = { bookings: number; customers: number; earnings: Money };
