import { test, expect } from '@playwright/test';

test('renders the app shell', async ({ page }) => {
  await page.route('**/orders', (route) =>
    route.fulfill({ json: { active: [], past: [] } }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible();
});
