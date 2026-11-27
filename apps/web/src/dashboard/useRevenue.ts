import { fetchRevenue } from './dashboard-api';
import type { RevenueSeries } from './types';
import { usePeriodResource } from './usePeriodResource';

const isEmpty = (series: RevenueSeries) => series.points.every((p) => p.amountMinor === 0);
const load = (...args: Parameters<typeof fetchRevenue>) => fetchRevenue(...args);

export function useRevenue() {
  return usePeriodResource('weekly', load, isEmpty);
}
