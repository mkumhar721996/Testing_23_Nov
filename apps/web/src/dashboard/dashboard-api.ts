import { getAccessToken } from '../auth/session';
import type {
  DashboardStats,
  Message,
  PackageSort,
  Period,
  RecentTrip,
  RevenueSeries,
  TopDestinations,
  TravelPackage,
  UpcomingTrip,
} from './types';

async function getDashboard<T>(path: string, signal?: AbortSignal): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/dashboard/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(`Dashboard ${path} request failed: ${response.status}`);
  return (await response.json()) as T;
}

export const fetchDashboardStats = (signal?: AbortSignal) => getDashboard<DashboardStats>('stats', signal);
export const fetchRecentTrips = (signal?: AbortSignal) => getDashboard<RecentTrip[]>('recent-trips', signal);
export const fetchUpcomingTrips = (signal?: AbortSignal) =>
  getDashboard<UpcomingTrip[]>('upcoming-trips', signal);
export const fetchTravelPackages = (sort: PackageSort, signal?: AbortSignal) =>
  getDashboard<TravelPackage[]>(`travel-packages?sort=${sort}`, signal);
export const fetchMessages = (signal?: AbortSignal) => getDashboard<Message[]>('messages', signal);
export const fetchRevenue = (period: Period, signal?: AbortSignal) =>
  getDashboard<RevenueSeries>(`revenue?period=${period}`, signal);
export const fetchTopDestinations = (period: Period, signal?: AbortSignal) =>
  getDashboard<TopDestinations>(`destinations?period=${period}`, signal);
