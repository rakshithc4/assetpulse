import { test, expect } from '@playwright/test';

test('full maintenance lifecycle flips equipment status and updates insights', async ({ page }) => {
  await page.goto('/login');
  await page.getByText('Supervisor').click();
  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: 'Equipment', exact: true }).click();
  await page.getByRole('link', { name: 'CRU-104' }).click();
  await expect(page).toHaveURL('/equipment/1');
  await expect(page.getByText('Operational')).toBeVisible();
  await page.getByText('Report fault').click();

  await page.getByLabel('Title').fill('Excessive vibration');
  await page.getByLabel('Severity').selectOption('HIGH');
  await page.getByText('Submit request').click();
  await expect(page).toHaveURL('/requests');

  await page.getByText('Excessive vibration').click();
  await page.getByText('Convert to work order').click();
  await page.getByRole('button', { name: 'Convert', exact: true }).last().click();
  await expect(page.getByText('CONVERTED')).toBeVisible();

  await page.getByRole('link', { name: 'Orders', exact: true }).click();
  await page.locator('a[href^="/orders/"]').first().click();

  await page.getByText('Schedule', { exact: true }).click();
  const today = new Date().toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(today);
  await page.getByPlaceholder('Technician').fill('tech@demo');
  await page.getByRole('button', { name: 'Schedule', exact: true }).last().click();
  await expect(page.getByText('Scheduled')).toBeVisible();

  await page.getByText('Start work').click();
  await expect(page.getByText('In progress')).toBeVisible();

  await page.getByText('Complete', { exact: true }).click();
  await page.getByPlaceholder('Downtime hours').fill('4');
  await page.getByRole('button', { name: 'Complete', exact: true }).last().click();
  await expect(page.getByText('Completed')).toBeVisible();

  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByText('Downtime by site')).toBeVisible();
});
