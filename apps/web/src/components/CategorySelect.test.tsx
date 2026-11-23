import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategorySelect } from './CategorySelect';

afterEach(() => vi.unstubAllGlobals());

describe('CategorySelect', () => {
  it('AC5 asks for active categories only and offers no retired one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ categories: [{ id: 'c1', name: 'Travel', retired: false }], canManage: false }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<CategorySelect id="cat" value="" onChange={() => {}} />);
    expect(await screen.findByRole('option', { name: 'Travel' })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain('?active=true');
    expect(screen.getByRole('option', { name: 'Choose a category' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Client entertainment' })).toBeNull();
  });
});
