import { expect, test } from '@playwright/test';

const restaurants = [
  { id: 'r1', name: 'Harbour Street Noodles', cuisine: 'Japanese', isOpen: true, hoursLabel: 'Open 11:00 to 22:00', deliveryFeeCents: 350, etaLabel: '25–35 min' },
  { id: 'r2', name: 'Green Bowl Kitchen', cuisine: 'Vegetarian', isOpen: false, hoursLabel: 'Opens 11:00 tomorrow', deliveryFeeCents: 300, etaLabel: '30–40 min' },
];

test('a visitor browses restaurants and reads a menu without signing in', async ({ page }) => {
  await page.route('**/restaurants', (route) => route.fulfill({ json: { restaurants } }));
  await page.route('**/restaurants/r1/menu', (route) =>
    route.fulfill({
      json: {
        ...restaurants[0],
        serviceLocations: ['2000'],
        menuUpdatedAt: new Date().toISOString(),
        categories: [
          { name: 'Ramen', items: [{ id: 'i1', name: 'Shoyu ramen', description: '', priceCents: 1450, isAvailable: true }] },
        ],
      },
    }),
  );

  await page.goto('/');
  await expect(page.getByRole('link', { name: /Harbour Street Noodles/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Green Bowl Kitchen/ })).toBeVisible();
  await expect(page.getByText(/sign in$/i)).toHaveCount(0);

  await page.getByRole('link', { name: /Harbour Street Noodles/ }).click();
  await expect(page.getByRole('heading', { name: 'Harbour Street Noodles' })).toBeVisible();
  await expect(page.getByText('Shoyu ramen')).toBeVisible();
  await expect(page.getByText(/sign in$/i)).toHaveCount(0);
});
