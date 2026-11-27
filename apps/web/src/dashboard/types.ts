// Mirrors the Operations API contract (services/operations-api/openapi.yaml).
export type Money = { amountMinor: number; currency: string };

export type DashboardStats = { bookings: number; customers: number; earnings: Money };

export type Period = 'weekly' | 'monthly' | 'yearly';

export type RevenuePoint = { label: string; amountMinor: number };
export type RevenueSeries = { period: Period; currency: string; points: RevenuePoint[] };

export type DestinationShare = { name: string; country: string; percent: number; participants: number };
export type TopDestinations = { period: Period; destinations: DestinationShare[] };
