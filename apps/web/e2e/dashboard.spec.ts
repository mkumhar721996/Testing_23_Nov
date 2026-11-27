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
