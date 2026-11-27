import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DayPanel from './DayPanel';

const tokyo = {
  id: 't',
  destination: 'Tokyo, Japan',
  type: 'Cultural exploration',
  start: '2028-07-12',
  end: '2028-07-19',
};

describe('DayPanel', () => {
  it('lists the trips of the date and takes focus', () => {
    render(<DayPanel date="2028-07-12" trips={[tokyo]} onClose={() => {}} />);
    const panel = screen.getByRole('region', { name: 'Trips on 12 July 2028' });
    expect(panel).toHaveFocus();
    expect(screen.getByRole('heading', { name: '12 July 2028' })).toBeInTheDocument();
    expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument();
    expect(screen.getByText('Cultural exploration')).toBeInTheDocument();
    expect(screen.getByText('Trip days 12 – 19 July')).toBeInTheDocument();
  });

  it('sentence-cases the trip type', () => {
    render(<DayPanel date="2028-07-12" trips={[{ ...tokyo, type: 'CITY BREAK' }]} onClose={() => {}} />);
    expect(screen.getByText('City break')).toBeInTheDocument();
  });

  it('shows the empty message with no trips', () => {
    render(<DayPanel date="2028-07-11" trips={[]} onClose={() => {}} />);
    expect(screen.getByText('No trips on 11 July 2028')).toBeInTheDocument();
    expect(
      screen.getByText('Trips that start, end or run through this date will be listed here.'),
    ).toBeInTheDocument();
  });

  it('calls onClose from the Close button', () => {
    const onClose = vi.fn();
    render(<DayPanel date="2028-07-12" trips={[tokyo]} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
