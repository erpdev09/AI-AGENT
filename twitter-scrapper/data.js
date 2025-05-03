const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './user_data',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });

  console.log('✅ Please log in manually to Twitter. This session will be saved.');
  console.log('⏳ Waiting for 2 minutes...');

  await new Promise(resolve => setTimeout(resolve, 120000)); // 2 min wait
  console.log('✅ Done. Closing browser...');

  await browser.close();
})();
