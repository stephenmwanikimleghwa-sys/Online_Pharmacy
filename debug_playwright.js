const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123'); // modify if necessary
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  
  console.log("Navigating to inventory...");
  await page.goto('http://localhost:3000/inventory');

  await page.waitForTimeout(1000);

  console.log("Clicking Add Medicine...");
  // Find button with text "Add Medicine"
  const addMedicineBtn = await page.getByRole('button', { name: /Add Medicine/i });
  if (await addMedicineBtn.count() > 0) {
    await addMedicineBtn.first().click();
    await page.waitForTimeout(1000);
    console.log("Clicked Add Medicine.");
  } else {
    console.log("Could not find Add Medicine button");
  }

  console.log("Clicking Bulk Add...");
  const bulkAddBtn = await page.getByRole('button', { name: /Bulk Add/i });
  if (await bulkAddBtn.count() > 0) {
    await bulkAddBtn.first().click();
    await page.waitForTimeout(1000);
    console.log("Clicked Bulk Add.");
  } else {
    console.log("Could not find Bulk Add button");
  }

  console.log("Errors captured:");
  console.log(errors.join('\n'));
  
  // Save DOM
  const html = await page.content();
  fs.writeFileSync('playwright_dom.html', html);
  
  await browser.close();
})();
