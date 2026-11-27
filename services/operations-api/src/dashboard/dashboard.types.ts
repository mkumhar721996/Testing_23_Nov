export type Money = { amountMinor: number; currency: string }; // ISO 4217, minor units

export type DashboardStats = { bookings: number; customers: number; earnings: Money };
