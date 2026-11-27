import { describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';
import { SAMPLE_STATS } from './sample-data';
import { SampleStatsRepository } from './sample-stats.repository';
import { SampleTripsRepository } from './sample-trips.repository';

describe('DashboardService.getStats', () => {
  it('returns the sample travel totals', async () => {
    const service = new DashboardService(new SampleStatsRepository(), new SampleTripsRepository());
    expect(await service.getStats()).toEqual(SAMPLE_STATS);
    expect(SAMPLE_STATS).toEqual({
      bookings: 1200,
      customers: 2845,
      earnings: { amountMinor: 1234560, currency: 'USD' },
    });
  });
});
