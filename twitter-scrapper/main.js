const puppeteer = require('puppeteer');
const login = require('./login');
const scrapeTweets = require('./scrape');
const { analyzeAndSaveTweets } = require('../client/clientreply'); // Importing clientreply.js
const { checkAndScrapeUnreadDMs } = require('../client/replydm'); // Importing readdm.js
const { scrollTwitterFeed } = require('../client/scroll'); // Importing scroll.js

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const username = 'Elisabethxbt';
    const password = 'Takemyheart@1';
    const searchQuery = '@Elisabethxbt';

    // Login to Twitter
    await login(page, username, password);

    // Step 1: Scrape Tweets
    console.log("Scraping tweets...");
    const tweets = await scrapeTweets(page, searchQuery);
    console.log("Final Scraped Data:", tweets);

    // Step 2: Analyze and reply to tweets using AI (clientreply.js)
    console.log("Analyzing and generating replies for tweets...");
    await analyzeAndSaveTweets();

    // Step 3: Check and reply to unread DMs (readdm.js)
    console.log("Checking unread DMs...");
    await checkAndScrapeUnreadDMs();

    // Step 4: Scroll through the feed and like posts (scroll.js)
    console.log("Scrolling through Twitter feed...");
    await scrollTwitterFeed();

    // Close the browser after tasks are completed
    await browser.close();
})();
