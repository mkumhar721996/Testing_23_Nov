import { test, expect } from '@playwright/test';

test('renders the app shell with the Orders entry', async ({ page }) => {
  await page.route('**/api/orders', (route) => route.fulfill({ json: [] }));
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
});
