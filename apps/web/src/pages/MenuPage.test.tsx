import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, getMenu, type RestaurantMenu } from '../api/restaurants';
import MenuPage from './MenuPage';

vi.mock('../api/restaurants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/restaurants')>()),
  getMenu: vi.fn(),
}));
const mocked = vi.mocked(getMenu);

const menu: RestaurantMenu = {
  id: 'r1',
  name: 'Harbour Street Noodles',
  cuisine: 'Japanese',
  isOpen: true,
  hoursLabel: 'Open 11:00 to 22:00',
  deliveryFeeCents: 350,
  etaLabel: '25–35 min',
  serviceLocations: ['2000', '2010'],
  menuUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  categories: [
    {
      name: 'Ramen',
      items: [
        { id: 'i1', name: 'Shoyu ramen', description: 'Soy broth', priceCents: 1450, isAvailable: true },
        { id: 'i2', name: 'Spicy tonkotsu ramen', description: '', priceCents: 1650, isAvailable: false },
      ],
    },
  ],
};

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={['/restaurants/r1']}>
      <Routes>
        <Route path="/restaurants/:id" element={<MenuPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocked.mockReset();
});

describe('MenuPage', () => {
  it('shows the menu with no sign-in (AC2, AC4)', async () => {
    mocked.mockResolvedValue(menu);
    renderMenu();
    expect(await screen.findByRole('heading', { name: 'Harbour Street Noodles' })).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledWith('r1');
    expect(screen.getByRole('heading', { name: 'Ramen' })).toBeInTheDocument();
    expect(screen.getByText('$14.50')).toBeInTheDocument();
    expect(screen.queryByText(/sign in$/i)).not.toBeInTheDocument();
    expect(screen.getByText('Serves 2000, 2010')).toBeInTheDocument();
    expect(screen.getByText('Menu updated 2 hours ago.')).toBeInTheDocument();
  });

  it('marks an unavailable item and keeps it listed (AC8)', async () => {
    mocked.mockResolvedValue(menu);
    renderMenu();
    const row = (await screen.findByText('Spicy tonkotsu ramen')).closest('li')!;
    expect(within(row).getByText('Unavailable')).toBeInTheDocument();
    expect(row).toHaveAttribute('data-unavailable', 'true');
    const available = screen.getByText('Shoyu ramen').closest('li')!;
    expect(within(available).queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('fetches on every mount (AC3)', async () => {
    mocked.mockResolvedValue(menu);
    const first = renderMenu();
    await screen.findByRole('heading', { name: 'Harbour Street Noodles' });
    first.unmount();
    renderMenu();
    await screen.findByRole('heading', { name: 'Harbour Street Noodles' });
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('warns when the restaurant is closed but still shows the menu', async () => {
    mocked.mockResolvedValue({ ...menu, isOpen: false });
    renderMenu();
    expect(await screen.findByText(/This restaurant is closed right now\./)).toBeInTheDocument();
    expect(screen.getByText('Shoyu ramen')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    mocked.mockReturnValue(new Promise(() => undefined));
    renderMenu();
    expect(screen.getByRole('status', { name: 'Loading menu' })).toBeInTheDocument();
  });

  it('shows an error and retries', async () => {
    mocked.mockRejectedValueOnce(new Error('boom'));
    renderMenu();
    expect(await screen.findByText("We couldn't load this menu.")).toBeInTheDocument();
    mocked.mockResolvedValue(menu);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Harbour Street Noodles' })).toBeInTheDocument();
  });

  it('shows not found for an unknown restaurant', async () => {
    mocked.mockRejectedValue(new NotFoundError('missing'));
    renderMenu();
    expect(await screen.findByRole('heading', { name: "We couldn't find that restaurant" })).toBeInTheDocument();
  });
});
