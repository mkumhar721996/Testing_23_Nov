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
