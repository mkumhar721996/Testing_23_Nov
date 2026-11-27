import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TravelAreas from './TravelAreas';

const labels = ['Packages', 'Bookings', 'Calendar', 'Travelers', 'Guides', 'Gallery', 'Messages', 'Deals', 'Feedback'];

describe('TravelAreas', () => {
  it('lists the nine areas in order', () => {
    render(<TravelAreas onComingSoon={vi.fn()} />);
    const nav = screen.getByRole('navigation', { name: 'Travel areas' });
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(labels);
  });

  it.each(labels)('%s reports coming soon', (label) => {
    const onComingSoon = vi.fn();
    render(<TravelAreas onComingSoon={onComingSoon} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(onComingSoon).toHaveBeenCalledWith(label);
  });
});
