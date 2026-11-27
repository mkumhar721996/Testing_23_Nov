import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MonthCalendar from './MonthCalendar';
import { fetchMonthTrips } from './trips-api';
import type { Trip } from './types';

vi.mock('./trips-api', () => ({ fetchMonthTrips: vi.fn() }));

const t = (id: string, destination: string, type: string, start: string, end: string): Trip => ({
  id,
  destination,
  type,
  start,
  end,
});

const TRIPS: Trip[] = [
  t('p', 'Paris, France', 'Romantic getaway', '2028-07-05', '2028-07-10'),
  t('t', 'Tokyo, Japan', 'Cultural exploration', '2028-07-12', '2028-07-19'),
  t('l', 'Lisbon, Portugal', 'Food and wine tour', '2028-07-12', '2028-07-13'),
  t('v', 'Venice, Italy', 'Waterfront escape', '2028-07-28', '2028-08-03'),
];

// Resolves each month with the trips overlapping it, like the API does.
function mockApi(trips: Trip[] = TRIPS) {
  vi.mocked(fetchMonthTrips).mockImplementation(async (month) => ({
    month,
    trips: trips.filter((x) => x.start <= `${month}-31` && x.end >= `${month}-01`),
  }));
}

function setup(now = new Date(2028, 6, 15)) {
  vi.useFakeTimers({ toFake: ['Date'], now });
  return { click: async (el: HTMLElement) => void fireEvent.click(el) };
}

describe('MonthCalendar', () => {
  beforeEach(() => mockApi());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('moves to the adjacent month with the arrows (AC1)', async () => {
    const user = setup();
    render(<MonthCalendar />);
    await screen.findByRole('heading', { name: 'July 2028' });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('heading', { name: 'August 2028' })).toBeInTheDocument();
    expect(fetchMonthTrips).toHaveBeenLastCalledWith('2028-08', expect.anything());
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('heading', { name: 'June 2028' })).toBeInTheDocument();
  });

  it('has no week view or Today control (AC2)', async () => {
    setup();
    render(<MonthCalendar />);
    await screen.findByRole('heading', { name: 'July 2028' });
    expect(screen.queryByRole('button', { name: /today/i })).toBeNull();
    expect(screen.queryByText(/week/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: /month$/ })).toHaveLength(2);
  });

  it('opens the day panel listing the trips of a date (AC3)', async () => {
    const user = setup();
    render(<MonthCalendar />);
    await user.click(await screen.findByRole('button', { name: '12 July, 2 trips' }));
    const panel = screen.getByRole('region', { name: 'Trips on 12 July 2028' });
    expect(within(panel).getByText('Tokyo, Japan')).toBeInTheDocument();
    expect(within(panel).getByText('Lisbon, Portugal')).toBeInTheDocument();
    expect(within(panel).getByText('Trip days 12 – 19 July')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12 July, 2 trips' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lists a trip that spans months on a date in the later month (AC3)', async () => {
    const user = setup();
    render(<MonthCalendar />);
    await screen.findByRole('heading', { name: 'July 2028' });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await user.click(await screen.findByRole('button', { name: '2 August, 1 trip' }));
    const panel = screen.getByRole('region', { name: 'Trips on 2 August 2028' });
    expect(within(panel).getByText('Trip days 28 July – 3 August')).toBeInTheDocument();
  });

  it('closes the panel with Close and returns focus to the date', async () => {
    const user = setup();
    render(<MonthCalendar />);
    const date = await screen.findByRole('button', { name: '12 July, 2 trips' });
    await user.click(date);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: /Trips on/ })).toBeNull();
    expect(date).toHaveFocus();
    expect(date).not.toHaveAttribute('aria-pressed');
  });

  it('closes the panel when the month changes', async () => {
    const user = setup();
    render(<MonthCalendar />);
    await user.click(await screen.findByRole('button', { name: '12 July, 2 trips' }));
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await screen.findByRole('heading', { name: 'August 2028' });
    expect(screen.queryByRole('region', { name: /Trips on/ })).toBeNull();
  });

  it('shows an empty message for a date without trips (AC4)', async () => {
    const user = setup();
    render(<MonthCalendar />);
    await user.click(await screen.findByRole('button', { name: '11 July' }));
    const panel = screen.getByRole('region', { name: 'Trips on 11 July 2028' });
    expect(within(panel).getByText('No trips on 11 July 2028')).toBeInTheDocument();
  });

  it('shows every date of the month as a button and the rest as inert cells (AC7)', async () => {
    setup();
    render(<MonthCalendar />);
    const grid = await screen.findByRole('group', { name: 'Dates in July 2028' });
    expect(within(grid).getAllByRole('button').map((b) => b.textContent)).toEqual(
      Array.from({ length: 31 }, (_, i) => String(i + 1)),
    );
    expect(grid.querySelectorAll('.day.out[aria-hidden="true"]').length).toBe(6 + 5);
    expect(screen.queryByText('No trips this month')).toBeNull();
  });

  it('shows 29 dates for February in a leap year (AC7)', async () => {
    setup(new Date(2028, 1, 10));
    render(<MonthCalendar />);
    const grid = await screen.findByRole('group', { name: 'Dates in February 2028' });
    expect(within(grid).getAllByRole('button')).toHaveLength(29);
    expect(grid.querySelectorAll('.day.out').length).toBe(2 + 4);
  });

  describe('a month with no trips', () => {
    beforeEach(() => mockApi([]));

    it('still shows the normal grid (AC5)', async () => {
      setup(new Date(2028, 8, 5));
      render(<MonthCalendar />);
      const grid = await screen.findByRole('group', { name: 'Dates in September 2028' });
      expect(within(grid).getAllByRole('button')).toHaveLength(30);
      expect(within(grid).getByText('Sun')).toBeInTheDocument();
    });

    it('shows the note (AC6)', async () => {
      setup(new Date(2028, 8, 5));
      render(<MonthCalendar />);
      expect(await screen.findByText('No trips this month')).toBeInTheDocument();
    });

    it('keeps the arrows working (AC8)', async () => {
      const user = setup(new Date(2028, 8, 5));
      render(<MonthCalendar />);
      await screen.findByText('No trips this month');
      await user.click(screen.getByRole('button', { name: 'Next month' }));
      expect(await screen.findByRole('heading', { name: 'October 2028' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Previous month' }));
      await user.click(screen.getByRole('button', { name: 'Previous month' }));
      expect(await screen.findByRole('heading', { name: 'August 2028' })).toBeInTheDocument();
    });

    it('still opens the day panel with its empty message (AC8)', async () => {
      const user = setup(new Date(2028, 8, 5));
      render(<MonthCalendar />);
      await user.click(await screen.findByRole('button', { name: '9 September' }));
      expect(screen.getByText('No trips on 9 September 2028')).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('is busy while loading', () => {
      setup();
      vi.mocked(fetchMonthTrips).mockReturnValue(new Promise(() => {}));
      const { container } = render(<MonthCalendar />);
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.getByRole('heading', { name: 'July 2028' })).toBeInTheDocument();
    });

    it('shows an error with a retry that keeps the arrows usable', async () => {
      const user = setup();
      vi.mocked(fetchMonthTrips).mockRejectedValue(new Error('x'));
      render(<MonthCalendar />);
      expect(await screen.findByText("We couldn't load your trips.")).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      vi.mocked(fetchMonthTrips).mockClear();
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(fetchMonthTrips).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();
    });
  });
});
