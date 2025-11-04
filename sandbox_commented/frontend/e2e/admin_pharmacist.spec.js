// import { test, expect } from '@playwright/test';
// 
// // E2E: Admin creates pharmacist -> pharmacist logs in -> manages inventory
// test('admin creates pharmacist account and pharmacist can login', async ({ page }) => {
//   // Enable request logging
//   page.on('request', request => {
//     console.log(`>> ${request.method()} ${request.url()}`);
//   });
//   page.on('response', response => {
//     console.log(`<< ${response.status()} ${response.url()}`);
//   });
// 
//   console.log('Starting admin-pharmacist test...');
//   // Go to login page
//   console.log('Navigating to login page...');
//   await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
//   console.log('Navigation completed');
// 
//   // Fill in admin credentials
//   await page.fill('input[name="username"]', 'mwaniki');
//   await page.fill('input[name="password"]', 'Nyashinski@254');
// 
//   // Submit the form
//   await page.click('button[type="submit"]');
// 
//   // Wait for dashboard navigation
//   await page.waitForURL('**/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
// 
//   // Click Manage Users
//   const manageUsers = page.getByRole('button', { name: 'Manage Users' });
//   await manageUsers.click();
//   console.log('Clicked Manage Users');
// 
//   // Wait for navigation to users page
//   await page.waitForURL('**/admin/users', { waitUntil: 'networkidle', timeout: 10000 });
//   
//   // Click Add Pharmacist button
//   const addPharmacistButton = page.getByRole('button', { name: 'Add Pharmacist' });
//   await addPharmacistButton.click();
//   
//   // Fill in pharmacist details in the modal
//   await page.fill('input[name="username"]', 'pharmacist1');
//   await page.fill('input[name="password"]', 'changeme');
//   await page.fill('input[name="email"]', 'pharmacist1@example.com');
//   await page.fill('input[name="full_name"]', 'John Doe');
//   await page.fill('input[name="pharmacy_license"]', 'PHR12345');
//   
//   // Submit the form
//   await page.click('button[type="submit"]');
//   
//   // Wait for success message
//   await expect(page.locator('text=Pharmacist created successfully')).toBeVisible();
//   
//   // Log out
//   await page.click('button[aria-label="Logout"]');
//   
//   // Wait for navigation back to login
//   await page.waitForURL('**/login', { waitUntil: 'networkidle', timeout: 10000 });
//   
//   // Now login as the new pharmacist
//   await page.fill('input[name="username"]', 'pharmacist1');
//   await page.fill('input[name="password"]', 'changeme');
//   
//   // Submit the form
//   await page.click('button[type="submit"]');
//   
//   // Wait for dashboard navigation
//   await page.waitForURL('**/pharmacist/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
//   
//   // Verify we're on the pharmacist dashboard
//   await expect(page.locator('text=Pharmacist Dashboard').first()).toBeVisible();
// });
