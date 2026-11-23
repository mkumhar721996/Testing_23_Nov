import { test, expect } from '@playwright/test';

test('renders the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Product', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Expense categories', level: 1 })).toBeVisible();
});
