import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.js';

test('pharmacist login stores access_token and navigates to branch dashboard', async ({ page }) => {
  page.on('request', (request) => {
    console.log(`>> ${request.method()} ${request.url()}`);
  });
  page.on('response', (response) => {
    console.log(`<< ${response.status()} ${response.url()}`);
  });

  await loginAs(page, { username: 'pharmacist1', password: 'changeme' });

  await page.waitForURL('**/branch/dashboard', { waitUntil: 'networkidle', timeout: 15000 });

  const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(accessToken).toBeTruthy();

  const activeBranch = await page.evaluate(() => localStorage.getItem('active_branch'));
  expect(activeBranch).toBeTruthy();

  await expect(page.locator('text=Pharmacist Dashboard').first()).toBeVisible();

  const inventoryButton = page.getByRole('button', { name: 'Inventory Management' });
  await expect(inventoryButton).toBeVisible();
  await inventoryButton.click();

  await page.waitForURL('**/inventory', { waitUntil: 'networkidle', timeout: 10000 });
  await expect(page.locator('text=Stock').first()).toBeVisible();
});
