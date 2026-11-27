import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PeriodFilter from './PeriodFilter';

const press = (key: string) => fireEvent.keyDown(document.activeElement as Element, { key });

describe('PeriodFilter', () => {
  it('closes on Escape and returns focus to the trigger', () => {
    render(<PeriodFilter label="Revenue period" value="weekly" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Revenue period' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    press('Escape');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('moves between items with the arrow keys and reports a selection', () => {
    const onChange = vi.fn();
    render(<PeriodFilter label="Revenue period" value="weekly" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Revenue period' }));
    expect(screen.getByRole('menuitemradio', { name: 'Weekly' })).toHaveFocus();
    press('ArrowDown');
    expect(screen.getByRole('menuitemradio', { name: 'Monthly' })).toHaveFocus();
    press('ArrowUp');
    press('ArrowUp');
    expect(screen.getByRole('menuitemradio', { name: 'Yearly' })).toHaveFocus();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Yearly' }));
    expect(onChange).toHaveBeenCalledWith('yearly');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on an outside click', () => {
    render(<PeriodFilter label="Revenue period" value="weekly" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Revenue period' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
