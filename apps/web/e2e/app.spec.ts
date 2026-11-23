import { test, expect } from '@playwright/test';

test('renders the dashboard', async ({ page }) => {
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      json: {
        customerName: 'Alex Morgan',
        currency: 'USD',
        totalBalance: 100,
        moneyInThisMonth: 0,
        moneyOutThisMonth: 0,
        accounts: [{ id: 'a1', name: 'Everyday Current', maskedNumber: '····4821', balance: 100 }],
        recentTransactions: [],
        savings: [],
        cards: [],
        loans: [],
        spendingByCategory: [],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your accounts' })).toBeVisible();
});
