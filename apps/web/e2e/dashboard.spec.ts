import { test, expect } from '@playwright/test';

test('browses the month calendar and opens the day panel', async ({ page }) => {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  await page.route('**/dashboard/stats', (route) =>
    route.fulfill({ json: { bookings: 1, customers: 1, earnings: { amountMinor: 100, currency: 'USD' } } }),
  );
  await page.route('**/dashboard/trips*', (route) => {
    const month = new URL(route.request().url()).searchParams.get('month');
    const trips =
      month === thisMonth
        ? [{ id: 't1', destination: 'Tokyo, Japan', type: 'Cultural exploration', start: `${month}-12`, end: `${month}-19` }]
        : [];
    return route.fulfill({ json: { month, trips } });
  });
  await page.goto('/');
  const grid = page.getByRole('group', { name: /^Dates in / });
  await expect(grid).toBeVisible();

  await page.getByRole('button', { name: 'Next month' }).click();
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByText('No trips this month')).toBeVisible();
  await expect(grid.getByRole('button').first()).toBeVisible();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: 'Previous month' }).click();

  await grid.getByRole('button', { name: /^12 .*, 1 trip$/ }).click();
  await expect(page.getByRole('region', { name: /^Trips on 12 / })).toContainText('Tokyo, Japan');
  await grid.getByRole('button', { name: /^11 [A-Za-z]+$/ }).click();
  await expect(page.getByText(/^No trips on 11 /)).toBeVisible();
});

test('shows the travel dashboard with three all-time stat tiles', async ({ page }) => {
  const reqs: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/dashboard/stats')) reqs.push(r.url());
  });
  await page.route('**/dashboard/stats', (route) =>
    route.fulfill({
      json: { bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
  await expect(page.locator('.stat-value')).toHaveText(['1,200', '2,845', '$12,346']);
  await expect(page.getByText(/credit card|loan|transactions/i)).toHaveCount(0);
  expect(reqs.every((u) => new URL(u).search === '')).toBe(true);
});
