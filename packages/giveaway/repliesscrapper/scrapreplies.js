// scrapeReplies-with-showMore.js
const puppeteer = require('puppeteer');

const TWEET_URL = 'https://nitter.net/Elisabethxbt/status/1917477216256155833#m';

async function scrapeTweetBodies(url) {
  const browser = await puppeteer.launch({ headless: false }); 
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });


    await page.waitForSelector(' .tweet-body', { timeout: 15000 });

    let allTweetBodies = [];

    let tweetBodies = await page.$$eval(' .tweet-body', (nodes) =>
      nodes.map(el => el.innerText.trim()).filter(text => text.length > 0)
    );

    allTweetBodies = [...allTweetBodies, ...tweetBodies];

    console.log(`✅ Found ${tweetBodies.length} tweet bodies on first load`);

    // Look for the "show more" button
    let hasMore = await page.$('.show-more');

    // Loop to click "show more" and scrape more replies until no more button exists
    while (hasMore) {
      console.log('⏩ Clicking "Show More" to load more replies...');
      
      // Click the "Show More" button
      await page.click('.show-more');
      
      // Wait for the new tweet bodies to load by waiting for any .tweet-body to appear
      await page.waitForSelector('#r.replies .tweet-body', { timeout: 10000 });

      // Scrape the new replies
      tweetBodies = await page.$$eval('#r.replies .tweet-body', (nodes) =>
        nodes.map(el => el.innerText.trim()).filter(text => text.length > 0)
      );

      // Add new replies to the list
      allTweetBodies = [...allTweetBodies, ...tweetBodies];

      console.log(`✅ Found ${tweetBodies.length} more tweet bodies`);

      // Check if the "show more" button still exists
      hasMore = await page.$('.show-more');
    }

    // Once there are no more "show more" buttons, log all tweet bodies
    console.log(`✅ Scraped a total of ${allTweetBodies.length} tweet bodies.`);
    allTweetBodies.forEach((body, i) => {
      console.log(`[${i + 1}] ${body}\n`);
    });
  } catch (err) {
    console.error('❌ Error scraping .tweet-body:', err.message);
  } finally {
    await browser.close();
  }
}

scrapeTweetBodies(TWEET_URL);
