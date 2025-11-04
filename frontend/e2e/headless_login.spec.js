import { test, expect } from '@playwright/test';

// E2E: Admin login -> token stored -> navigate to admin dashboard -> open Manage Users
// Assumptions: frontend dev server running at http://localhost:3000 and backend at http://127.0.0.1:8000

test('admin login stores access_token and navigates to admin dashboard, Manage Users opens', async ({ page }) => {
  // Enable request logging
  page.on('request', request => {
    console.log(`>> ${request.method()} ${request.url()}`);
  });
  page.on('response', response => {
    console.log(`<< ${response.status()} ${response.url()}`);
  });
  
  console.log('Starting test...');
  // Go to login page
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  console.log('Navigation completed');

  // Fill in credentials
  await page.fill('input[name="username"]', 'mwaniki');
  await page.fill('input[name="password"]', 'changeme');

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for dashboard navigation
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

  // Check localStorage has access_token
  const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(accessToken).toBeTruthy();

  // Admin Dashboard should be visible
  await expect(page.locator('text=Admin Dashboard')).toBeVisible();

  // Quick Actions / Manage Users button should be visible
  const manageUsers = page.getByRole('button', { name: 'Manage Users' });
  await expect(manageUsers).toBeVisible();

  // Click Manage Users and expect navigation
  await manageUsers.click();
  console.log('Clicked Manage Users button');
  await page.waitForURL('**/admin/users', { waitUntil: 'networkidle', timeout: 10000 });
  console.log('Navigation to users page complete');

  // The Manage Users heading should be visible on the users page
  await expect(page.locator('text=Manage Users').first()).toBeVisible();
});
