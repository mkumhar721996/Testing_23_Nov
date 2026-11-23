import { render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import App from './App';

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('renders the shell with the Expense categories page under Settings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ categories: [], canManage: true }), { status: 200 })),
    );
    render(<App />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings', hidden: true })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Expense categories', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('No expense categories yet')).toBeInTheDocument();
  });
});
