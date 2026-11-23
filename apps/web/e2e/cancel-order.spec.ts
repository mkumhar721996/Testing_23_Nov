import { test, expect } from '@playwright/test';

const placedOrder = {
  id: '4821',
  status: 'placed',
  canCancel: true,
  restaurant: 'Harbor Noodle House',
  placedAt: '2026-11-23T12:14:00Z',
  items: [{ name: 'Beef pho', quantity: 1, price: 12.5 }],
  total: 12.5,
  currency: 'GBP',
};

test('a customer can keep or cancel a placed order', async ({ page }) => {
  let status = 'placed';
  await page.route('**/orders/4821', (route) =>
    route.fulfill({ json: { ...placedOrder, status, canCancel: status === 'placed' } }),
  );
  await page.route('**/orders/4821/cancel', (route) => {
    status = 'cancelled';
    return route.fulfill({ status: 201, json: { ...placedOrder, status } });
  });

  await page.goto('/orders/4821');
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('button', { name: 'Keep order' }).click();
  await expect(page.getByText('Order cancelled')).toHaveCount(0);

  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByText('Order cancelled')).toBeVisible();
});
