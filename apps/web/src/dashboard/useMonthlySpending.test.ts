import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAccessTokenSource } from '../auth/session';
import { useMonthlySpending } from './useMonthlySpending';

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessTokenSource(async () => '');
});

describe('useMonthlySpending', () => {
  it('sends the bearer token and the browser time zone', async () => {
    setAccessTokenSource(async () => 'fake-token');
    const body = { month: '2026-11', currency: 'GBP', totalMinor: 0, categories: [] };
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetchSpy);
    const { result } = renderHook(() => useMonthlySpending());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(url).toContain(`/spending/monthly?timeZone=${encodeURIComponent(zone)}`);
    expect(init.headers).toEqual({ Authorization: 'Bearer fake-token' });
  });

  it('reports an error for a failed response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    const { result } = renderHook(() => useMonthlySpending());
    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });
});
