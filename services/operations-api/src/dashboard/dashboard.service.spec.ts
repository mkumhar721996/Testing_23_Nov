import { describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';
import { SAMPLE_STATS } from './sample-data';
import { SampleStatsRepository } from './sample-stats.repository';
import { SampleWidgetsRepository } from './sample-widgets.repository';

const makeService = () => new DashboardService(new SampleStatsRepository(), new SampleWidgetsRepository());

describe('DashboardService.getStats', () => {
  it('returns the sample travel totals', async () => {
    expect(await makeService().getStats()).toEqual(SAMPLE_STATS);
    expect(SAMPLE_STATS).toEqual({
      bookings: 1200,
      customers: 2845,
      earnings: { amountMinor: 1234560, currency: 'USD' },
    });
  });
});

const periods = ['weekly', 'monthly', 'yearly'] as const;

describe('DashboardService.getRevenue', () => {
  const service = makeService();

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
  const service = makeService();

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

describe('DashboardService widgets', () => {
  it('returns recent trips newest first', async () => {
    const trips = await makeService().getRecentTrips();
    expect(trips.map((t) => t.destination)).toEqual(['Sydney, Australia', 'Venice, Italy', 'Paris, France']);
    expect(trips[0].expenses).toEqual({ amountMinor: 218000, currency: 'USD' });
  });

  it('returns upcoming trips', async () => {
    expect((await makeService().getUpcomingTrips()).map((t) => t.destination)).toEqual([
      'Paris, France',
      'Tokyo, Japan',
    ]);
  });

  it('returns travel packages in the requested order', async () => {
    const service = makeService();
    expect((await service.getTravelPackages('latest')).length).toBe(3);
    const popular = await service.getTravelPackages('most-booked');
    expect(popular[0].bookings).toBeGreaterThanOrEqual(popular[1].bookings);
    expect(popular[1].bookings).toBeGreaterThanOrEqual(popular[2].bookings);
    const latest = await service.getTravelPackages('latest');
    expect(latest[0].createdAt >= latest[1].createdAt).toBe(true);
  });

  it('returns messages with unread counts', async () => {
    expect((await makeService().getMessages()).map((m) => m.unread)).toEqual([1, 3]);
  });
});
