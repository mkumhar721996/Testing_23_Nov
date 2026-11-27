import { Injectable } from '@nestjs/common';
import { SAMPLE_BOOKINGS, SAMPLE_TRIPS } from './sample-data';
import type { SearchRepository } from './search.repository';
import type { SearchResults } from './search.types';

@Injectable()
export class SampleSearchRepository implements SearchRepository {
  // Case-insensitive "contains" on the name only; sample order is kept.
  async search(term: string): Promise<SearchResults> {
    const needle = term.toLowerCase();
    const matches = ({ name }: { name: string }) => name.toLowerCase().includes(needle);
    return {
      trips: SAMPLE_TRIPS.filter(matches).map((t) => ({ ...t })),
      bookings: SAMPLE_BOOKINGS.filter(matches).map((b) => ({ ...b })),
    };
  }
}
