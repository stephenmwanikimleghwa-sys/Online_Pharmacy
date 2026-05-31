import { test, expect } from '@playwright/test';
import { loginAs, completeAdminLoginToDashboard } from './helpers/auth.js';

test('admin login stores access_token and navigates to admin dashboard, Manage Users opens', async ({ page }) => {
  page.on('request', (request) => {
    console.log(`>> ${request.method()} ${request.url()}`);
  });
  page.on('response', (response) => {
    console.log(`<< ${response.status()} ${response.url()}`);
  });

  await loginAs(page, { username: 'mwaniki', password: 'changeme' });

  await completeAdminLoginToDashboard(page);

  const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(accessToken).toBeTruthy();

  await expect(page.locator('text=Admin Dashboard').first()).toBeVisible();
  await expect(page.locator('text=Global Overview').first()).toBeVisible();

  await page.getByRole('link', { name: /User Management/i }).click();
  await page.waitForURL('**/admin/users', { waitUntil: 'networkidle', timeout: 10000 });

  await expect(page.locator('text=Manage Users').first()).toBeVisible();
});
