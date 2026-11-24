import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ComingSoonToast, { useComingSoon } from './ComingSoonToast';

describe('ComingSoonToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing without a message', () => {
    render(<ComingSoonToast message={null} onDismiss={() => undefined} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the message and dismisses it after 4 seconds', () => {
    const onDismiss = vi.fn();
    render(<ComingSoonToast message="Transaction history is coming soon." onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Transaction history is coming soon.');
    act(() => vi.advanceTimersByTime(3999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss after unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<ComingSoonToast message="x" onDismiss={onDismiss} />);
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('useComingSoon', () => {
  it('names the feature in the message and can dismiss it', () => {
    const { result } = renderHook(() => useComingSoon());
    expect(result.current.message).toBeNull();
    act(() => result.current.show('Transaction history'));
    expect(result.current.message).toBe('Transaction history is coming soon.');
    act(() => result.current.dismiss());
    expect(result.current.message).toBeNull();
  });
});
