import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCurrentUserSource } from '../auth/session';
import TopBar from './TopBar';

const type = (value: string) =>
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search trips and bookings' }), {
    target: { value },
  });

describe('TopBar', () => {
  afterEach(() => setCurrentUserSource(() => null));

  it('keeps the menu button and the logo', () => {
    render(<TopBar onComingSoon={vi.fn()} onSearch={vi.fn()} searching={false} />);
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(within(header).getByText('Product')).toBeInTheDocument();
  });

  it('submits the trimmed term with the button and with Enter', () => {
    const onSearch = vi.fn();
    render(<TopBar onComingSoon={vi.fn()} onSearch={onSearch} searching={false} />);
    type('  Paris ');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith('Paris');
    // Enter in a form's only text field submits the form.
    fireEvent.submit(screen.getByRole('search'));
    expect(onSearch).toHaveBeenCalledTimes(2);
  });

  it('shows an error and makes no request for a blank term', () => {
    const onSearch = vi.fn();
    render(<TopBar onComingSoon={vi.fn()} onSearch={onSearch} searching={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('Enter part of a trip or booking name to search.')).toBeInTheDocument();
    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveFocus();
    expect(onSearch).not.toHaveBeenCalled();
    type('P');
    expect(screen.queryByText('Enter part of a trip or booking name to search.')).toBeNull();
  });

  it('disables the button while searching', () => {
    render(<TopBar onComingSoon={vi.fn()} onSearch={vi.fn()} searching />);
    expect(screen.getByRole('button', { name: 'Searching…' })).toBeDisabled();
  });

  it('empties the input when the clear signal changes', () => {
    const { rerender } = render(<TopBar onComingSoon={vi.fn()} onSearch={vi.fn()} searching={false} clearSignal={0} />);
    type('Paris');
    rerender(<TopBar onComingSoon={vi.fn()} onSearch={vi.fn()} searching={false} clearSignal={1} />);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('holds the menu, brand, notifications and account buttons', () => {
    render(<TopBar onComingSoon={vi.fn()} onSearch={vi.fn()} searching={false} />);
    const header = screen.getByRole('banner');
    expect(within(header).getAllByRole('button')).toHaveLength(4);
    expect(within(header).getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(within(header).getByText('Product')).toBeInTheDocument();
  });

  it('opens the account menu with Log out', () => {
    setCurrentUserSource(() => ({ name: 'Manoj Kumhar', email: 'm@x.example', role: 'Admin' }));
    render(<TopBar onComingSoon={vi.fn()} onSearch={vi.fn()} searching={false} />);
    const trigger = screen.getByRole('button', { name: 'Account menu for Manoj Kumhar' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows coming soon for Notifications without opening a menu', () => {
    const onComingSoon = vi.fn();
    render(<TopBar onComingSoon={onComingSoon} onSearch={vi.fn()} searching={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(onComingSoon).toHaveBeenCalledWith('Notifications');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
