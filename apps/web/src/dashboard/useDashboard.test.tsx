import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { useDashboard } from './useDashboard';
import { makeDashboard } from './fixtures';

afterEach(() => vi.unstubAllGlobals());

const ok = (d = makeDashboard()) => ({ ok: true, status: 200, json: async () => d });

describe('useDashboard', () => {
  it('goes from loading to ready', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
    const { result } = renderHook(() => useDashboard());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('goes from loading to error with retried false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current).toMatchObject({ status: 'error', retried: false }));
  });

  it('retry goes error, loading, error with retried true', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('down'));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current).toMatchObject({ status: 'error', retried: true }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retry can reach ready', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
