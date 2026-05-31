/**
 * Shared E2E helpers for login and branch selection flows.
 */

export async function loginAs(page, { username, password, baseUrl = 'http://localhost:3000' }) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

/**
 * Admins with multiple branches must pick one on /branch/select before the dashboard.
 */
export async function completeAdminLoginToDashboard(page, targetGlob = '**/admin/dashboard', timeout = 20000) {
  await page.waitForURL(/\/(login|branch\/select|admin\/dashboard)/, { timeout });

  if (page.url().includes('/branch/select')) {
    await page.locator('button:has(p.font-bold)').first().click({ timeout: 10000 });
  }

  await page.waitForURL(targetGlob, { waitUntil: 'networkidle', timeout });
}
