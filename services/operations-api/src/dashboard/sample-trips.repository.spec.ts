import { describe, expect, it } from 'vitest';
import { DashboardService } from './dashboard.service';
import { SampleStatsRepository } from './sample-stats.repository';
import { SampleTripsRepository } from './sample-trips.repository';
import { SampleWidgetsRepository } from './sample-widgets.repository';

const service = () =>
  new DashboardService(
    new SampleStatsRepository(),
    new SampleWidgetsRepository(),
    new SampleTripsRepository(() => new Date(2028, 6, 15)),
  );

describe('DashboardService.getTrips', () => {
  it('lists two trips starting on 12 July of the current month', async () => {
    const july = await service().getTrips('2028-07');
    expect(july.month).toBe('2028-07');
    expect(july.trips.filter((t) => t.start === '2028-07-12')).toHaveLength(2);
  });

  it('sorts by start then id', async () => {
    const { trips } = await service().getTrips('2028-07');
    const keys = trips.map((t) => `${t.start}|${t.id}`);
    expect(keys).toEqual([...keys].sort());
  });

  it('includes a trip that crosses into the next month', async () => {
    const august = await service().getTrips('2028-08');
    expect(august.trips.map((t) => t.destination)).toContain('Venice, Italy');
  });

  it('returns no trips for a later month', async () => {
    expect((await service().getTrips('2028-09')).trips).toEqual([]);
  });

  it('has ten trips in total across the sample months', async () => {
    const months = ['2028-02', '2028-03', '2028-04', '2028-05', '2028-06', '2028-07', '2028-08'];
    const ids = new Set<string>();
    for (const m of months) (await service().getTrips(m)).trips.forEach((t) => ids.add(t.id));
    expect(ids.size).toBe(10);
  });
});
