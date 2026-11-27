import { test, expect } from '@playwright/test';

const noDefects = {
  openDefects: { items: [], total: 0 },
  recentlyUpdated: [],
  hasAnyDefects: false,
  projects: [],
};

test('shows the spending chart and the same figures as a text list', async ({ page }) => {
  await page.route('**/my-work', (route) => route.fulfill({ json: noDefects }));
  await page.route('**/spending/monthly*', (route) =>
    route.fulfill({
      json: {
        month: '2026-11',
        currency: 'GBP',
        totalMinor: 25100,
        categories: [
          { category: 'Groceries', totalMinor: 24000 },
          { category: null, totalMinor: 1100 },
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Spending by category/ })).toBeVisible();
  await expect(page.getByTestId('spending-bar')).toHaveCount(2);
  const table = page.getByRole('table', { name: 'Same figures as text' });
  await expect(table.getByRole('row', { name: /Groceries.*£240\.00/ })).toBeVisible();
  await expect(table.getByRole('row', { name: /Uncategorised.*£11\.00/ })).toBeVisible();
});

test('shows a message instead of the chart when there is no spending', async ({ page }) => {
  await page.route('**/my-work', (route) => route.fulfill({ json: noDefects }));
  await page.route('**/spending/monthly*', (route) =>
    route.fulfill({
      json: { month: '2026-11', currency: 'GBP', totalMinor: 0, categories: [] },
    }),
  );
  await page.goto('/');
  await expect(page.getByText('No spending this month')).toBeVisible();
  await expect(page.getByTestId('spending-bar')).toHaveCount(0);
});
