import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./my-work/my-work-api', () => ({
  fetchMyWork: async () => ({
    openDefects: { items: [], total: 0 },
    recentlyUpdated: [],
    hasAnyDefects: false,
    projects: [{ id: 'p1', name: 'Payments portal' }],
  }),
}));

beforeEach(() => {
  window.location.hash = '#/';
});

describe('App', () => {
  it('lands on My work without the old dashboard content', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'My work' })).toBeInTheDocument();
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Credit cards' })).toBeNull();
    expect(screen.queryByRole('list', { name: /Recent transactions/ })).toBeNull();
  });

  it('shows the coming soon dialog over the page from the menu and closes it', async () => {
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'My work' });
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This feature is coming soon.');
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'My work' })).toBeVisible();
  });

  it('opens the create-defect form from the call-to-action', async () => {
    render(<App />);
    const [cta] = await screen.findAllByRole('link', { name: 'Create defect' });
    fireEvent.click(cta);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create defect' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('shows the defect page for a defect route', async () => {
    window.location.hash = '#/defects/d1';
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('d1');
  });
});
