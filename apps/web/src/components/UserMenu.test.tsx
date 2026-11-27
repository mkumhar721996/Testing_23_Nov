import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCurrentUserSource, setSignOutHandler } from '../auth/session';
import UserMenu from './UserMenu';

const manager = { name: 'Manoj Kumhar', email: 'm@x.example', role: 'Admin' };

function open() {
  const trigger = screen.getByRole('button', { name: /account menu/i });
  fireEvent.click(trigger);
  return trigger;
}

describe('UserMenu', () => {
  afterEach(() => {
    setCurrentUserSource(() => null);
    setSignOutHandler(async () => {});
  });

  it('opens an account menu with Log out and toggles closed', () => {
    render(<UserMenu user={null} onComingSoon={vi.fn()} />);
    expect(screen.queryByRole('menu')).toBeNull();
    const trigger = open();
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(<UserMenu user={null} onComingSoon={vi.fn()} />);
    const trigger = open();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes on an outside mousedown', () => {
    render(<UserMenu user={null} onComingSoon={vi.fn()} />);
    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('focuses the first item and moves with arrow keys', () => {
    render(<UserMenu user={null} onComingSoon={vi.fn()} />);
    open();
    const [profile, logout] = screen.getAllByRole('menuitem');
    expect(profile).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(logout).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(profile).toHaveFocus();
  });

  it('labels the trigger with the user and shows their email', () => {
    render(<UserMenu user={manager} onComingSoon={vi.fn()} />);
    open();
    expect(screen.getByRole('button', { name: 'Account menu for Manoj Kumhar' })).toBeInTheDocument();
    expect(screen.getByText('m@x.example')).toBeInTheDocument();
  });

  it('falls back to a generic label with no user', () => {
    render(<UserMenu user={null} onComingSoon={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
  });

  it('raises coming soon for Profile and closes', () => {
    const onComingSoon = vi.fn();
    render(<UserMenu user={null} onComingSoon={onComingSoon} />);
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(onComingSoon).toHaveBeenCalledWith('Profile');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('calls the registered sign-out handler on Log out', async () => {
    const signOutSpy = vi.fn().mockResolvedValue(undefined);
    setSignOutHandler(signOutSpy);
    render(<UserMenu user={null} onComingSoon={vi.fn()} />);
    open();
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
    });
    expect(signOutSpy).toHaveBeenCalledTimes(1);
  });

  it('shows a busy state while signing out', async () => {
    let finish!: () => void;
    setSignOutHandler(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<UserMenu user={null} onComingSoon={vi.fn()} />);
    open();
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
    });
    expect(screen.getByRole('menuitem', { name: /logging out/i })).toBeDisabled();
    await act(async () => finish());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('re-enables Log out and shows an error toast when sign-out fails', async () => {
    setSignOutHandler(() => Promise.reject(new Error('nope')));
    const onComingSoon = vi.fn();
    const onError = vi.fn();
    render(<UserMenu user={null} onComingSoon={onComingSoon} onError={onError} />);
    open();
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
    });
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeEnabled();
    expect(onComingSoon).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/could not log out/i));
  });
});
