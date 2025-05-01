require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const login = require('./login');
const scrapeTweets = require('./scrape');
const scrollTwitterFeed = require('../client/scroll');
const checkAndScrapeUnreadDMs = require('../client/replydm');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const searchQuery = process.env.TWITTER_SEARCH_QUERY;

  try {
    await login(page, username, password);
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    await browser.close();
    return;
  }

  let iteration = 0;
  while (true) {
    iteration++;
    try {
      console.log(`🔄 Starting iteration ${iteration}`);
      console.log("Scrape round 1");
      const tweets = await scrapeTweets(page, searchQuery);
      console.log("Scraped Tweets:", tweets);

      await new Promise(resolve => setTimeout(resolve, 15000));
      await scrollTwitterFeed(page);

      console.log("Starting DM reply process...");
      await checkAndScrapeUnreadDMs(page);

      console.log(`⏳ Waiting 20 seconds before next iteration...`);
      await new Promise(resolve => setTimeout(resolve, 20000));
    } catch (error) {
      console.error(`❌ Error in iteration ${iteration}:`, error.message);
      await page.screenshot({ path: `error_screenshot_iteration_${iteration}.png` });
      console.log(`🔄 Continuing to next iteration...`);
    }
  }

  await browser.close();
})();
