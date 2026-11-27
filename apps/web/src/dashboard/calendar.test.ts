import { describe, expect, it } from 'vitest';
import { formatDate, formatTripRange, monthGrid, shiftMonth, tripsOn } from './calendar';
import type { Trip } from './types';

const trip = (id: string, start: string, end: string): Trip => ({
  id,
  destination: 'Tokyo, Japan',
  type: 'Cultural exploration',
  start,
  end,
});

describe('shiftMonth', () => {
  it('rolls over the year in both directions', () => {
    expect(shiftMonth('2028-12', 1)).toBe('2029-01');
    expect(shiftMonth('2028-01', -1)).toBe('2027-12');
    expect(shiftMonth('2028-07', 1)).toBe('2028-08');
  });
});

describe('monthGrid', () => {
  it('counts leading, in-month and trailing cells', () => {
    expect(monthGrid(2028, 1)).toEqual({ lead: 2, days: 29, trailing: 4 }); // leap February
    expect(monthGrid(2028, 6)).toEqual({ lead: 6, days: 31, trailing: 5 });
    expect(monthGrid(2028, 11)).toEqual({ lead: 5, days: 31, trailing: 6 });
  });

  it('adds no trailing cells when the month ends on a Saturday', () => {
    expect(monthGrid(2026, 1)).toEqual({ lead: 0, days: 28, trailing: 0 });
  });
});

describe('tripsOn', () => {
  const trips = [trip('a', '2028-07-12', '2028-07-19'), trip('b', '2028-07-28', '2028-08-03')];

  it('includes both ends of a trip', () => {
    expect(tripsOn(trips, '2028-07-12').map((t) => t.id)).toEqual(['a']);
    expect(tripsOn(trips, '2028-07-19').map((t) => t.id)).toEqual(['a']);
  });

  it('includes a trip that spans months on a date in the later month', () => {
    expect(tripsOn(trips, '2028-08-02').map((t) => t.id)).toEqual(['b']);
  });

  it('returns nothing for a date outside every trip', () => {
    expect(tripsOn(trips, '2028-07-11')).toEqual([]);
  });
});

describe('formatTripRange', () => {
  it('uses one month name inside a month', () => {
    expect(formatTripRange(trip('a', '2028-07-12', '2028-07-19'))).toBe('12 – 19 July');
  });

  it('names both months across a month boundary', () => {
    expect(formatTripRange(trip('b', '2028-07-28', '2028-08-03'))).toBe('28 July – 3 August');
  });
});

describe('formatDate', () => {
  it('writes day, month name and year', () => {
    expect(formatDate('2028-07-12')).toBe('12 July 2028');
  });
});
