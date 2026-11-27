import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCurrentUserSource } from '../auth/session';
import TopBar from './TopBar';

describe('TopBar', () => {
  afterEach(() => setCurrentUserSource(() => null));

  it('holds the menu, brand, notifications and account buttons', () => {
    render(<TopBar onComingSoon={vi.fn()} />);
    const header = screen.getByRole('banner');
    expect(within(header).getAllByRole('button')).toHaveLength(3);
    expect(within(header).getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(within(header).getByText('Product')).toBeInTheDocument();
  });

  it('opens the account menu with Log out', () => {
    setCurrentUserSource(() => ({ name: 'Manoj Kumhar', email: 'm@x.example', role: 'Admin' }));
    render(<TopBar onComingSoon={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Account menu for Manoj Kumhar' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows coming soon for Notifications without opening a menu', () => {
    const onComingSoon = vi.fn();
    render(<TopBar onComingSoon={onComingSoon} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(onComingSoon).toHaveBeenCalledWith('Notifications');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
