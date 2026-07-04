const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    errors.push(`[PAGE ERROR] ${err.message}`);
  });
  
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Ingredients")');
  await page.waitForTimeout(3000);
  
  console.log('=== CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));
  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));
  
  await browser.close();
})().catch(err => {
  console.error('Playwright error:', err.message);
  process.exit(1);
});
