require('dotenv').config(); // Load environment variables from .env file
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const login = require('./login'); // Import the login function
const scrapeTweets = require('./scrape'); // Import the scrapeTweets function (assuming it exists)

/* This is a feature to scroll and likes the tweets */
// const scrollTwitterFeed = require('../client/scroll');

/* This is a feature to enable dms and replies */
// const checkAndScrapeUnreadDMs = require('../client/replydm');

(async () => {
  let browser; // Declare browser outside try so it can be accessed in finally
  try {
    browser = await puppeteer.launch({
      headless: false, // Run in non-headless mode to see the browser
      args: [
        '--no-sandbox', // Required for running in some environments (e.g., Docker)
        '--disable-setuid-sandbox',
        // Consider adding '--window-size=1280,800' if viewport issues persist
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 }); // Set viewport size

    // Retrieve credentials and search query from environment variables
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const verificationEmail = process.env.TWITTER_VERIFICATION_EMAIL; // Get verification email from .env
    const searchQuery = process.env.TWITTER_SEARCH_QUERY;

    // Validate that all required environment variables are set
    if (!username || !password || !searchQuery) {
      console.error("❌ Missing required environment variables: TWITTER_USERNAME, TWITTER_PASSWORD, or TWITTER_SEARCH_QUERY.");
      console.log("Please ensure your .env file is correctly configured.");
      if (browser) await browser.close(); // Close browser if it was launched
      return; // Exit if variables are missing
    }
    // Note: verificationEmail is optional, so we don't strictly require it here,
    // but the login function might log a warning if it's needed and not provided.


    await login(page, username, password, verificationEmail); // Pass verificationEmail to the login function

    console.log("✅ Logged in successfully.");
    console.log("Scraping tweets...");
    // Ensure scrapeTweets is correctly defined and imported if you use it
    // const tweets = await scrapeTweets(page, searchQuery);
    // console.log("✅ Scraped Tweets:", tweets);

    // Temporarily disabled features:
    // await scrollTwitterFeed(page);
    // await checkAndScrapeUnreadDMs(page);

    // Uncomment this block for continuous looping
    /*
    let iteration = 0;
    while (true) {
      iteration++;
      try {
        console.log(`🔄 Starting iteration ${iteration}`);
        // const tweets = await scrapeTweets(page, searchQuery);
        // console.log("Scraped Tweets:", tweets);

        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
        // await scrollTwitterFeed(page);
        // await checkAndScrapeUnreadDMs(page);

        console.log(`⏳ Waiting 20 seconds before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds
      } catch (loopError) {
        console.error(`❌ Error in iteration ${iteration}:`, loopError.message);
        try {
            await page.screenshot({ path: `error_screenshot_iteration_${iteration}.png` });
        } catch (screenshotError) {
            console.error('Failed to take screenshot during loop error:', screenshotError.message);
        }
        console.log(`🔄 Continuing to next iteration...`);
      }
    }
    */

  } catch (error) {
    console.error('❌ Error during execution:', error.message);
    // Ensure page object exists before trying to take a screenshot
    if (typeof page !== 'undefined' && page && typeof page.screenshot === 'function') {
        try {
            await page.screenshot({ path: `error_screenshot_main.png` });
        } catch (screenshotError) {
            console.error('Failed to take screenshot during main error:', screenshotError.message);
        }
    }
  } finally {
    if (browser) {
      console.log("🛑 Closing browser...");
      await browser.close();
    } else {
      console.log("Browser was not launched or already closed.");
    }
  }
})();
