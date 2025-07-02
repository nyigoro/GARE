const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2] || 'https://example.com';

  console.log(`[Puppeteer] Launching browser...`);
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  const page = await browser.newPage();

  console.log(`[Puppeteer] Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  const title = await page.title();
  console.log(`[Puppeteer] Page title: "${title}"`);

  const screenshot = `screenshot-${Date.now()}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log(`[Puppeteer] Screenshot saved: ${screenshot}`);

  const links = await page.$$eval('a', els => els.slice(0,5).map(e => e.href));
  console.log(`[Puppeteer] First 5 links:`, links);

  await browser.close();
  console.log(`[Puppeteer] Done.`);
})();
