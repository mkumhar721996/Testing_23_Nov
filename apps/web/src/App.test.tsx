import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./api/restaurants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/restaurants')>()),
  listRestaurants: vi.fn().mockResolvedValue({ restaurants: [] }),
}));

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('shows the Restaurants page with a single nav item', async () => {
    renderAt('/restaurants');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link')).toHaveLength(2); // brand + Restaurants
    expect(within(nav).getByRole('link', { name: 'Restaurants' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: /search|alerts/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Restaurants', level: 1 })).toBeInTheDocument();
  });

  it('renders the list at /', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Restaurants', level: 1 })).toBeInTheDocument();
  });

  it('has the store glyph in the sprite', () => {
    expect(readFileSync('design/icons.svg', 'utf8')).toContain('id="i-store"');
  });

  it('uses no colour literals in app CSS', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : [];
      });
    for (const file of walk('src')) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
    }
  });
});
