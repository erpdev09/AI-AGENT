const puppeteer = require('puppeteer');
const login = require('./login');
const scrapeTweets = require('./scrape');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const username = 'Elisabethxbt';
    const password = 'Takemyheart@1';
    const searchQuery = '@Elisabethxbt';

    await login(page, username, password);
    const tweets = await scrapeTweets(page, searchQuery);

    console.log("Final Scraped Data:", tweets);

    await browser.close();
})();
