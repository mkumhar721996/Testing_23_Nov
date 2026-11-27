import { test, expect, type Page } from '@playwright/test';

const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });

async function mockDashboard(page: Page, messagesStatus = 200) {
  await page.route('**/dashboard/stats', (route) =>
    route.fulfill({ json: { bookings: 1200, customers: 2845, earnings: usd(1234560) } }),
  );
  await page.route('**/dashboard/recent-trips', (route) =>
    route.fulfill({
      json: [
        { id: 'a', destination: 'Sydney, Australia', startDate: '2026-06-02', endDate: '2026-06-09', travelers: 2458, expenses: usd(218000) },
      ],
    }),
  );
  await page.route('**/dashboard/upcoming-trips', (route) =>
    route.fulfill({
      json: [
        { id: 'p', kind: 'Romantic getaway', destination: 'Paris, France', startDate: '2028-07-05', endDate: '2028-07-10' },
      ],
    }),
  );
  await page.route('**/dashboard/travel-packages*', (route) =>
    route.fulfill({ json: [{ id: 'p', destination: 'Paris, France', bookings: 320, createdAt: '2026-05-30' }] }),
  );
  await page.route('**/dashboard/messages', (route) =>
    messagesStatus === 200
      ? route.fulfill({
          json: [{ id: 'e', from: 'Europia Hotel', initials: 'EH', preview: 'We are pleased…', unread: 1 }],
        })
      : route.fulfill({ status: messagesStatus, body: 'error' }),
  );
}

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
  await mockDashboard(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
  await expect(page.locator('.stat-value')).toHaveText(['1,200', '2,845', '$12,346']);
  await expect(page.getByText(/credit card|loan|transactions/i)).toHaveCount(0);
  expect(reqs.every((u) => new URL(u).search === '')).toBe(true);
});

test('shows the four widgets and coming soon for a travel area', async ({ page }) => {
  await mockDashboard(page);
  await page.goto('/');
  for (const name of ['Recent trips', 'Upcoming trips', 'Travel packages', 'Messages']) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  await page.getByRole('navigation', { name: 'Travel areas' }).getByRole('button', { name: 'Bookings' }).click();
  await expect(page.getByRole('status')).toHaveText('Bookings is coming soon.');
});

test('a failing messages request leaves the other widgets alone', async ({ page }) => {
  await mockDashboard(page, 500);
  await page.goto('/');
  await expect(page.getByText("We couldn't load your messages.")).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent trips' })).toBeVisible();
  await expect(page.getByText('Sydney, Australia')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(1);
});
