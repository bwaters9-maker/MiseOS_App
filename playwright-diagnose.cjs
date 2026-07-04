const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:/Users/brian/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'
  });
  const page = await browser.newPage();
  
  const allLogs = [];
  const errors = [];
  
  page.on('console', msg => allLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(`[PAGE ERROR] ${err.message}`));
  
  await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 20000 });
  console.log('App loaded');
  await page.waitForTimeout(2000);
  
  await page.locator('button', { hasText: 'Ingredients' }).first().click();
  await page.waitForTimeout(5000);
  
  console.log('\n=== ALL CONSOLE LOGS ===');
  allLogs.forEach(l => console.log(l));
  
  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));
  
  await browser.close();
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
