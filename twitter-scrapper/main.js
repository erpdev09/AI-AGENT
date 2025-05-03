require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const login = require('./login');
const scrapeTweets = require('./scrape');

/* This is a feature to scroll and likes the tweets */
// const scrollTwitterFeed = require('../client/scroll');

/* This is a feature to enable dms and replies */
// const checkAndScrapeUnreadDMs = require('../client/replydm');

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

    console.log("✅ Logged in successfully.");
    console.log("Scraping tweets...");
    const tweets = await scrapeTweets(page, searchQuery);
    console.log("✅ Scraped Tweets:", tweets);

    // Temporarily disabled:
    // await scrollTwitterFeed(page);
    // await checkAndScrapeUnreadDMs(page);

    // Uncomment this block for continuous looping
    /*
    let iteration = 0;
    while (true) {
      iteration++;
      try {
        console.log(`🔄 Starting iteration ${iteration}`);
        const tweets = await scrapeTweets(page, searchQuery);
        console.log("Scraped Tweets:", tweets);

        await new Promise(resolve => setTimeout(resolve, 15000));
        // await scrollTwitterFeed(page);
        // await checkAndScrapeUnreadDMs(page);

        console.log(`⏳ Waiting 20 seconds before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, 20000));
      } catch (error) {
        console.error(`❌ Error in iteration ${iteration}:`, error.message);
        await page.screenshot({ path: `error_screenshot_iteration_${iteration}.png` });
        console.log(`🔄 Continuing to next iteration...`);
      }
    }
    */

  } catch (error) {
    console.error('❌ Error during execution:', error.message);
    await page.screenshot({ path: `error_screenshot.png` });
  } finally {
    console.log("🛑 Closing browser...");
    await browser.close();
  }
})();
