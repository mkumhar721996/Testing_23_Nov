import { test, expect } from '@playwright/test';

test('renders the app shell', async ({ page }) => {
  await page.route('**/restaurants', (route) => route.fulfill({ json: { restaurants: [] } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Restaurants', level: 1 })).toBeVisible();
});
