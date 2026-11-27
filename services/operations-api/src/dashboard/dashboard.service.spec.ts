import { describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';
import { SAMPLE_STATS } from './sample-data';
import { SampleStatsRepository } from './sample-stats.repository';

describe('DashboardService.getStats', () => {
  it('returns the sample travel totals', async () => {
    const service = new DashboardService(new SampleStatsRepository());
    expect(await service.getStats()).toEqual(SAMPLE_STATS);
    expect(SAMPLE_STATS).toEqual({
      bookings: 1200,
      customers: 2845,
      earnings: { amountMinor: 1234560, currency: 'USD' },
    });
  });
});

const periods = ['weekly', 'monthly', 'yearly'] as const;

describe('DashboardService.getRevenue', () => {
  const service = new DashboardService(new SampleStatsRepository());

  it('has a distinct shape per period', async () => {
    const weekly = await service.getRevenue('weekly');
    expect(weekly.points.map((p) => p.label)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(Math.max(...weekly.points.map((p) => p.amountMinor))).toBe(63500);
    expect((await service.getRevenue('monthly')).points).toHaveLength(12);
    expect((await service.getRevenue('yearly')).points.map((p) => p.label)).toEqual([
      '2023',
      '2024',
      '2025',
      '2026',
      '2027',
      '2028',
    ]);
  });

  it('differs for every pair of periods', async () => {
    for (const a of periods)
      for (const b of periods)
        if (a !== b) {
          expect(await service.getRevenue(a)).not.toEqual({ ...(await service.getRevenue(b)), period: a });
        }
  });
});

describe('DashboardService.getTopDestinations', () => {
  const service = new DashboardService(new SampleStatsRepository());

  it('differs for every pair of periods and sums to 100', async () => {
    for (const a of periods) {
      for (const b of periods) {
        if (a !== b) {
          expect((await service.getTopDestinations(a)).destinations).not.toEqual(
            (await service.getTopDestinations(b)).destinations,
          );
        }
      }
      const result = await service.getTopDestinations(a);
      expect(result.period).toBe(a);
      expect(result.destinations.reduce((s, d) => s + d.percent, 0)).toBe(100);
    }
  });
});
