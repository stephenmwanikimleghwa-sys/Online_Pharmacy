import { test, expect } from '@playwright/test';
import { loginAs, completeAdminLoginToDashboard } from './helpers/auth.js';

test('admin creates pharmacist account and pharmacist can login', async ({ page }) => {
  page.on('request', (request) => {
    console.log(`>> ${request.method()} ${request.url()}`);
  });
  page.on('response', (response) => {
    console.log(`<< ${response.status()} ${response.url()}`);
  });

  await loginAs(page, {
    username: 'mwaniki',
    password: 'Nyashinski@254',
    baseUrl: 'http://localhost:3001',
  });

  await completeAdminLoginToDashboard(page);

  await expect(page.locator('text=Admin Dashboard').first()).toBeVisible();

  await page.getByRole('link', { name: /User Management/i }).click();
  await page.waitForURL('**/admin/users', { waitUntil: 'networkidle', timeout: 10000 });

  const addPharmacistButton = page.getByRole('button', { name: 'Add Pharmacist' });
  await addPharmacistButton.click();

  await page.fill('input[name="username"]', 'pharmacist1');
  await page.fill('input[name="password"]', 'changeme');
  await page.fill('input[name="email"]', 'pharmacist1@example.com');
  await page.fill('input[name="full_name"]', 'John Doe');
  await page.fill('input[name="pharmacy_license"]', 'PHR12345');

  await page.click('button[type="submit"]');
  await expect(page.locator('text=Pharmacist created successfully')).toBeVisible();

  await page.click('button[aria-label="Logout"]');
  await page.waitForURL('**/login', { waitUntil: 'networkidle', timeout: 10000 });

  await loginAs(page, { username: 'pharmacist1', password: 'changeme', baseUrl: 'http://localhost:3001' });

  await page.waitForURL('**/branch/dashboard', { waitUntil: 'networkidle', timeout: 15000 });

  await expect(page.locator('text=Pharmacist Dashboard').first()).toBeVisible();
});
