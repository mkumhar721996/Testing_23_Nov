import { test, expect } from '@playwright/test';

const dashboard = {
  customerName: 'Alex Morgan',
  currency: 'USD',
  totalBalance: 34723.35,
  moneyInThisMonth: 5120,
  moneyOutThisMonth: 3482.17,
  accounts: [{ id: 'a1', name: 'Everyday Current', maskedNumber: '····4821', balance: 4210.1 }],
  recentTransactions: [],
  savings: [],
  cards: [],
  loans: [],
  spendingByCategory: [{ category: 'Housing', amount: 1450 }],
};

test('shows the dashboard', async ({ page }) => {
  await page.route('**/api/dashboard', (route) => route.fulfill({ json: dashboard }));
  await page.goto('/');
  await expect(page.getByText('Total balance')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your accounts' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Overview' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('recovers from an error with Try again', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/dashboard', (route) =>
    ++calls === 1 ? route.fulfill({ status: 500 }) : route.fulfill({ json: dashboard }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Your accounts' })).toBeVisible();
});
