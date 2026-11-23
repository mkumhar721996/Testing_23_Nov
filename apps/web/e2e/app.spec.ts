import { test, expect } from '@playwright/test';

test('sends a visitor who is not signed in to Entra ID and shows no onboarding data', async ({ page }) => {
  await page.route('https://login.microsoftonline.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: 'entra' }),
  );
  await page.goto('/onboarding');
  await page.waitForURL(/login\.microsoftonline\.com/);
  await expect(page.getByText('Start onboarding')).toHaveCount(0);
});
