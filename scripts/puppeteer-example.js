const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2] || 'https://example.com';

  console.log(`[Puppeteer] Launching browser...`);
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  console.log(`[Puppeteer] Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  const title = await page.title();
  console.log(`[Puppeteer] Page title: "${title}"`);

  const screenshotPath = `screenshot-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[Puppeteer] Screenshot saved to ${screenshotPath}`);

  const links = await page.$$eval('a', anchors =>
    anchors.slice(0, 5).map(a => a.href)
  );

  console.log(`[Puppeteer] First 5 links:`);
  links.forEach((link, i) => {
    console.log(`  ${i + 1}. ${link}`);
  });

  await browser.close();
  console.log(`[Puppeteer] Done.`);
})();
