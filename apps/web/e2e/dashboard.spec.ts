import { test, expect } from '@playwright/test';

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
