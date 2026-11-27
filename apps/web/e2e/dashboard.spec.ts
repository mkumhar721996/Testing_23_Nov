import { test, expect } from '@playwright/test';

const defect = (n: number) => ({
  id: `d${n}`,
  key: `DEF-${n}`,
  title: `Defect ${n}`,
  severity: 'High',
  status: 'Open',
  projectName: 'Payments portal',
  createdByName: 'Manoj',
  updatedAt: new Date(Date.now() - n * 60000).toISOString(),
});

test('lists my open and recently updated defects and opens a defect page', async ({ page }) => {
  await page.route('**/my-work', (route) =>
    route.fulfill({
      json: {
        openDefects: { items: [defect(1)], total: 1 },
        recentlyUpdated: [defect(1), defect(2)],
        hasAnyDefects: true,
        projects: [{ id: 'p1', name: 'Payments portal' }],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My work');
  await expect(page.getByText(/Good (morning|afternoon|evening)/)).toHaveCount(0);
  await page.getByRole('region', { name: 'My open defects' }).getByRole('link', { name: /Defect 1/ }).click();
  await expect(page).toHaveURL(/#\/defects\/d1$/);
});

test('a new person sees the empty state and can open the create-defect form', async ({ page }) => {
  await page.route('**/my-work', (route) =>
    route.fulfill({
      json: {
        openDefects: { items: [], total: 0 },
        recentlyUpdated: [],
        hasAnyDefects: false,
        projects: [{ id: 'p1', name: 'Payments portal' }],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'No defects found' })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Create defect' }).last().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create defect');
  await expect(page.getByLabel('Title')).toBeVisible();
});
