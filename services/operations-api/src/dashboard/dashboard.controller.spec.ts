import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AuthGuard } from '../auth/auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SampleStatsRepository } from './sample-stats.repository';
import { SampleWidgetsRepository } from './sample-widgets.repository';

const controller = () =>
  new DashboardController(new DashboardService(new SampleStatsRepository(), new SampleWidgetsRepository()));

describe('DashboardController', () => {
  it('treats an unknown sort as latest', async () => {
    const latest = await controller().getTravelPackages('latest');
    expect(await controller().getTravelPackages('bogus')).toEqual(latest);
    expect(await controller().getTravelPackages(undefined)).toEqual(latest);
  });

  it('sorts by bookings when asked', async () => {
    const packages = await controller().getTravelPackages('most-booked');
    expect(packages[0].bookings).toBeGreaterThanOrEqual(packages[1].bookings);
  });

  it('guards every route with AuthGuard', () => {
    expect(Reflect.getMetadata('__guards__', DashboardController)).toContain(AuthGuard);
  });
});
