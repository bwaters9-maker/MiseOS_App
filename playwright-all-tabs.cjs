const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:/Users/brian/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'
  });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', err => errors.push(`[PAGE ERROR] ${err.message}`));
  
  await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  
  const tabs = ['Crib Sheet', 'Features', 'Staff', 'Events', 'Ingredients', 'Prep Checklist', 'Kitchen Timers', 'Alert History', 'Test Kitchen', 'Settings'];
  
  for (const tab of tabs) {
    errors.length = 0; // reset per tab
    try {
      await page.locator('button', { hasText: tab }).first().click();
      await page.waitForTimeout(1500);
      const tabErrors = errors.filter(e => !e.includes('React DevTools'));
      console.log(`${tab}: ${tabErrors.length === 0 ? 'OK' : 'ERROR: ' + tabErrors[0]}`);
    } catch (e) {
      console.log(`${tab}: CLICK FAILED — ${e.message}`);
    }
  }
  
  await browser.close();
})().catch(err => console.error('Fatal:', err.message));
