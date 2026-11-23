import { test, expect, type Page } from '@playwright/test';

const STEPS = ['Placed', 'Accepted', 'Preparing', 'Ready', 'Completed'];
const KEYS = ['placed', 'accepted', 'preparing', 'ready', 'completed'];

function order(id: string, status: string) {
  return {
    id,
    restaurantName: 'Harbor Noodle House',
    placedAt: '2026-11-23T12:14:00.000Z',
    fulfilment: 'pickup',
    status,
    steps: KEYS.map((key, i) => ({ key, label: STEPS[i] })),
  };
}

async function mockApi(page: Page) {
  const orders = { o1: order('o1', 'placed'), o2: order('o2', 'preparing') };
  await page.route('**/api/orders', (route) => route.fulfill({ json: Object.values(orders) }));
  await page.route('**/api/orders/*', (route) => {
    const id = route.request().url().split('/').pop() as keyof typeof orders;
    return route.fulfill({ json: orders[id] });
  });
}

test('Orders entry opens the status of the tapped order', async ({ page }) => {
  await mockApi(page);
  await page.goto('/orders');
  await page.getByRole('link', { name: 'Track order' }).nth(1).click();
  await expect(page.getByRole('heading', { name: 'Order #o2' })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveText('Preparing');

  await page.getByRole('link', { name: 'Your orders' }).first().click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Orders' }).click();
  await expect(page.getByRole('heading', { name: 'Order #o2' })).toBeVisible();
});
