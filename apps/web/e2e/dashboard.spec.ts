import { test, expect } from '@playwright/test';

const gbp = (amountMinor: number) => ({ amountMinor, currency: 'GBP' });

test('shows the greeting and one card per product in order', async ({ page }) => {
  await page.route('**/dashboard', (route) =>
    route.fulfill({
      json: {
        customer: { name: 'Maya' },
        products: [
          { id: 'f', type: 'fixed_deposit', name: 'Term deposit', last4: '7710', currency: 'GBP', depositedAmount: gbp(500000), maturityDate: '2027-03-14', interestRatePercent: 4.6 },
          { id: 'l', type: 'loan', name: 'Personal loan', last4: '4406', currency: 'GBP', outstandingBalance: gbp(685000) },
          { id: 'c', type: 'credit_card', name: 'Credit card', last4: '0952', currency: 'GBP', amountOwed: gbp(38642), availableCredit: gbp(461358) },
          { id: 'a', type: 'account', name: 'Checking account', last4: '2291', currency: 'GBP', currentBalance: gbp(421580) },
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Maya');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Accounts', 'Credit cards', 'Loans', 'Fixed deposits']);
  await expect(page.getByText('•••• 2291')).toBeVisible();
});
