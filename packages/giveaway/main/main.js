require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const login = require('./login');
const scrapeTweets = require('./scrape');


(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const searchQuery = process.env.TWITTER_SEARCH_QUERY;

  try {
    await login(page, username, password);

    console.log("✅ Logged in successfully.");
    console.log("Scraping tweets...");
    const tweets = await scrapeTweets(page, searchQuery);
    console.log("✅ Scraped Tweets:", tweets);

 
  } catch (error) {
    console.error('❌ Error during execution:', error.message);
    await page.screenshot({ path: `error_screenshot.png` });
  } finally {
    console.log("🛑 Closing browser...");
    await browser.close();
  }
})();
