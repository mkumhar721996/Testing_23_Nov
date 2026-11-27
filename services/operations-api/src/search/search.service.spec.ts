import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SampleSearchRepository } from './sample-search.repository';
import { SearchService } from './search.service';

describe('SearchService.search', () => {
  const service = new SearchService(new SampleSearchRepository());

  it('finds trips whose name contains the term, case-insensitively (AC1)', async () => {
    const res = await service.search('paris');
    expect(res.trips.map((t) => t.id)).toEqual(['T-101', 'T-071']);
    expect((await service.search('ROMANTIC')).trips.map((t) => t.id)).toEqual(['T-101']);
    expect((await service.search('Laurent')).trips).toEqual([]);
  });

  it('finds bookings whose name contains the term, case-insensitively (AC2)', async () => {
    const res = await service.search('paris');
    expect(res.bookings.map((b) => b.id)).toEqual(['B-2041', 'B-1987']);
    expect((await service.search('laurent')).bookings.map((b) => b.id)).toEqual(['B-2041']);
    expect(await service.search('zzz')).toEqual({ trips: [], bookings: [] });
  });

  it('rejects a blank term', async () => {
    await expect(service.search('   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search(undefined)).rejects.toBeInstanceOf(BadRequestException);
  });
});
