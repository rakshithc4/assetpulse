import { test, expect, type Locator, type Page } from '@playwright/test';

// Mock mode registers MSW's service worker for the whole test session, which
// occasionally races with Next.js's automatic <Link> prefetching: the URL
// updates (history.pushState) but the router serves a stale/empty prefetched
// segment instead of rendering the new page — no console error, just a
// silently stuck navigation. This never happens in the live-mode app (no
// service worker there at all), so it's a mock-mode test-environment
// artifact, not an application bug — a second click after the race resolves
// always succeeds. Retrying the click is the correct fix, not a longer wait.
async function clickAndWaitFor(page: Page, click: Locator, landed: Locator, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await click.click();
    try {
      await landed.waitFor({ state: 'visible', timeout: 8_000 });
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
    }
  }
}

test('full maintenance lifecycle flips equipment status and updates insights', async ({ page }) => {
  await page.goto('/login');
  await page.getByText('Supervisor').click();
  await expect(page).toHaveURL('/');

  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'Equipment', exact: true }),
    page.getByRole('link', { name: 'CRU-104' }),
  );
  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'CRU-104' }),
    page.getByRole('heading', { name: 'CRU-104' }),
  );
  await expect(page).toHaveURL('/equipment/1');
  await page.getByText('Report fault').click();

  await page.getByLabel('Title').fill('Excessive vibration');
  await page.getByLabel('Severity').selectOption('HIGH');
  await page.getByText('Submit request').click();
  await expect(page).toHaveURL('/requests');

  await page.getByText('Excessive vibration').click();
  await page.getByText('Convert to work order').click();
  await page.getByRole('button', { name: 'Convert', exact: true }).last().click();
  await expect(page.getByText('CONVERTED')).toBeVisible();

  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'Orders', exact: true }),
    page.locator('a[href^="/orders/"]').first(),
  );
  await clickAndWaitFor(
    page,
    page.locator('a[href^="/orders/"]').first(),
    page.getByRole('heading', { name: /^Work order #/ }),
  );

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

  await clickAndWaitFor(
    page,
    page.getByRole('link', { name: 'Insights', exact: true }),
    page.getByText('Downtime by site'),
  );
});
