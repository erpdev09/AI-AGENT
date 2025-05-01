require('dotenv').config();
const puppeteer = require('puppeteer');
const login = require('./login'); // Assuming login.js is in the same directory
const scrapeTweets = require('./scrape'); // Assuming scrape.js is in the same directory
const scrollTwitterFeed = require('../client/scroll'); // Assuming scroll.js is in client folder
const checkAndScrapeUnreadDMs = require('../client/replydm'); // Assuming replydm.js is in client folder

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const searchQuery = process.env.TWITTER_SEARCH_QUERY;

  // Log in to X
  try {
    await login(page, username, password); // Make sure login.js handles the login process
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    await browser.close();
    return;
  }

  // Infinite loop to repeat scrape, scroll, and DM reply
  let iteration = 0;
  while (true) {
    iteration++;
    try {
      console.log(`🔄 Starting iteration ${iteration}`);

      // Scrape tweets once
      console.log("Scrape round 1");
      const tweets = await scrapeTweets(page, searchQuery);
      console.log("Scraped Tweets:", tweets);

      // Wait briefly before scrolling
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Run scroll logic
      await scrollTwitterFeed(page);

      // Run DM reply logic using the same session
      console.log("Starting DM reply process...");
      await checkAndScrapeUnreadDMs(page);

      // Delay before next iteration to avoid rate limiting
      console.log(`⏳ Waiting 20 seconds before next iteration...`);
      await new Promise(resolve => setTimeout(resolve, 20000));
    } catch (error) {
      console.error(`❌ Error in iteration ${iteration}:`, error.message);
      // Take a screenshot for debugging
      await page.screenshot({ path: `error_screenshot_iteration_${iteration}.png` });
      // Continue to next iteration
      console.log(`🔄 Continuing to next iteration...`);
    }
  }

  // Note: The loop is infinite, so this line won't be reached unless the script is stopped
  await browser.close();
})();
