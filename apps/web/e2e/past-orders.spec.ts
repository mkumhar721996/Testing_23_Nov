import { test, expect } from '@playwright/test';

const base = {
  restaurantId: 'r1',
  placedAt: '2026-11-21T12:00:00.000Z',
  itemCount: 3,
  totalMinor: 1950,
  currency: 'GBP',
};

test.beforeEach(async ({ page }) => {
  await page.route('**/orders', (route) =>
    route.fulfill({
      json: {
        active: [{ ...base, id: '4821', restaurantName: 'Harbor Noodle House', status: 'placed' }],
        past: [{ ...base, id: '4755', restaurantName: 'Pizza Lane', status: 'completed' }],
      },
    }),
  );
  await page.route('**/orders/4755/reorder', (route) =>
    route.fulfill({ json: { cartId: 'cart1', addedItemCount: 3 } }),
  );
  await page.goto('/');
});

test('shows Active and Past tabs', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Active' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Past' })).toBeVisible();
});

test('Reorder opens the cart', async ({ page }) => {
  await page.getByRole('tab', { name: 'Past' }).click();
  await page.getByRole('button', { name: 'Reorder' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
});

test('Track order opens the order status for that order', async ({ page }) => {
  await page.getByRole('button', { name: 'Track order' }).click();
  await expect(page.getByRole('heading', { name: 'Order status' })).toBeVisible();
  await expect(page.getByText('Order 4821')).toBeVisible();
});
