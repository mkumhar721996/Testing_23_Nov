import { Injectable } from '@nestjs/common';
import type { Trip } from './dashboard.types';
import { SAMPLE_TRIPS } from './sample-data';
import type { TripsRepository } from './trips.repository';

const pad = (n: number) => String(n).padStart(2, '0');

@Injectable()
export class SampleTripsRepository implements TripsRepository {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getTripsForMonth(month: string): Promise<Trip[]> {
    const first = `${month}-01`;
    const last = `${month}-31`; // ISO dates compare as strings, so 31 bounds every month
    return this.trips()
      .filter((t) => t.start <= last && t.end >= first)
      .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  }

  private trips(): Trip[] {
    const now = this.now();
    const date = (offset: number, day: number) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, day);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    return SAMPLE_TRIPS.map(({ start, end, ...trip }) => ({
      ...trip,
      start: date(...start),
      end: date(...end),
    }));
  }
}
