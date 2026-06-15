const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log("Launching puppeteer...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Go to login page
  console.log("Going to login page...");
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

  // 2. Fill login form (assuming basic username/password for admin)
  console.log("Logging in...");
  await page.type('input[type="text"]', 'admin');
  // Usually input type=password is used for password
  await page.type('input[type="password"]', 'admin123'); // Adjust this if different
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard or somewhere else
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});

  // 3. Go to inventory page
  console.log("Going to inventory page...");
  await page.goto('http://localhost:3000/inventory', { waitUntil: 'networkidle0' });

  // Take a screenshot before clicking
  await page.screenshot({ path: '/home/steve/pharmacy-aggregator/before_click.png' });

  // 4. Click the "Add Medicine" button
  console.log("Looking for Add Medicine button...");
  const buttons = await page.$$('button');
  let clicked = false;
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Add Medicine')) {
      await btn.click();
      clicked = true;
      console.log("Clicked Add Medicine!");
      break;
    }
  }

  if (!clicked) {
    console.log("Could not find Add Medicine button.");
  } else {
    // Wait for modal to appear
    await new Promise(r => setTimeout(r, 1000));
    
    // Take a screenshot of the modal
    await page.screenshot({ path: '/home/steve/pharmacy-aggregator/after_click.png' });

    // Dump DOM of modal
    const overlayHtml = await page.evaluate(() => {
      const overlay = document.querySelector('.modal-overlay');
      return overlay ? overlay.outerHTML : 'No modal-overlay found';
    });
    fs.writeFileSync('/home/steve/pharmacy-aggregator/modal_dom.html', overlayHtml);
    console.log("Saved DOM to modal_dom.html");
  }

  await browser.close();
})();
