import { test, expect } from '@playwright/test';

// E2E: Pharmacist login -> token stored -> navigate to pharmacist dashboard -> inventory management
test('pharmacist login stores access_token and navigates to pharmacist dashboard', async ({ page }) => {
  // Enable request logging
  page.on('request', request => {
    console.log(`>> ${request.method()} ${request.url()}`);
  });
  page.on('response', response => {
    console.log(`<< ${response.status()} ${response.url()}`);
  });

  console.log('Starting pharmacist test...');
  // Go to login page
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  console.log('Navigation completed');

  // Fill in pharmacist credentials
  await page.fill('input[name="username"]', 'pharmacist1');
  await page.fill('input[name="password"]', 'changeme');

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for dashboard navigation
  await page.waitForURL('**/pharmacist/dashboard', { waitUntil: 'networkidle', timeout: 15000 });

  // Check localStorage has access_token
  const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(accessToken).toBeTruthy();

  // Pharmacist Dashboard should be visible
  await expect(page.locator('text=Pharmacist Dashboard').first()).toBeVisible();

  // Inventory Management button should be visible
  const inventoryButton = page.getByRole('button', { name: 'Inventory Management' });
  await expect(inventoryButton).toBeVisible();

  // Click Inventory Management and expect navigation
  await inventoryButton.click();
  console.log('Clicked Inventory Management button');
  await page.waitForURL('**/inventory', { waitUntil: 'networkidle', timeout: 10000 });
  console.log('Navigation to inventory page complete');

  // The Inventory heading should be visible
  await expect(page.locator('text=Inventory Management').first()).toBeVisible();

  // Check that we can add new inventory items
  const addItemButton = page.getByRole('button', { name: 'Add Item' });
  await expect(addItemButton).toBeVisible();
});