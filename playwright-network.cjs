const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:/Users/brian/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'
  });
  const page = await browser.newPage();
  
  const requests = [];
  const failures = [];
  const logs = [];
  const errors = [];
  
  page.on('request', req => {
    if (req.url().includes('IngredientsTable') || req.url().includes('units') || req.url().includes('costEngine')) {
      requests.push(`REQ: ${req.url()}`);
    }
  });
  
  page.on('requestfailed', req => {
    if (req.url().includes('IngredientsTable') || req.url().includes('src/')) {
      failures.push(`FAIL: ${req.url()} — ${req.failure()?.errorText}`);
    }
  });
  
  page.on('response', async resp => {
    if (resp.url().includes('IngredientsTable')) {
      const status = resp.status();
      const body = await resp.text().catch(() => 'body read failed');
      requests.push(`RESP ${status}: ${resp.url()} (${body.length} bytes)`);
      requests.push(`  contains "module START"? ${'module START' in body} (actually: ${body.includes('module START')})`);
      requests.push(`  contains "export default"? ${body.includes('export default')}`);
    }
  });
  
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(`[ERROR] ${err.message}`));
  
  await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.locator('button', { hasText: 'Ingredients' }).first().click();
  await page.waitForTimeout(4000);
  
  console.log('\n=== INGREDIENT-RELATED NETWORK ===');
  requests.forEach(r => console.log(r));
  
  console.log('\n=== FAILURES ===');
  failures.forEach(f => console.log(f));
  
  console.log('\n=== KEY CONSOLE LOGS ===');
  logs.filter(l => l.includes('module') || l.includes('INGREDIENTS') || l.includes('MODULE')).forEach(l => console.log(l));
  
  await browser.close();
})().catch(err => console.error('Fatal:', err.message));
