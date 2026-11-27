import { fetchTopDestinations } from './dashboard-api';
import type { TopDestinations } from './types';
import { usePeriodResource } from './usePeriodResource';

const isEmpty = (top: TopDestinations) => top.destinations.length === 0;
const load = (...args: Parameters<typeof fetchTopDestinations>) => fetchTopDestinations(...args);

export function useTopDestinations() {
  return usePeriodResource('monthly', load, isEmpty);
}
