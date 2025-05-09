// scrapeReplies-tweetBodyOnly.js
const puppeteer = require('puppeteer');

const TWEET_URL = 'https://nitter.net/Elisabethxbt/status/1920760298958364787';

async function scrapeTweetBodies(url) {
  const browser = await puppeteer.launch({ headless: false }); // visible browser for debug
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // Explicitly wait for at least one .tweet-body to appear
    await page.waitForSelector('#r.replies .tweet-body', { timeout: 15000 });

    // Now extract both the tweet body and tweet ID
    const tweetData = await page.$$eval('#r.replies .tweet-body', (nodes) =>
      nodes.map(el => {
        const body = el.innerText.trim();
        const tweetId = el.closest('div').getAttribute('data-tweet-id');
        return { tweetId, body };
      }).filter(tweet => tweet.body.length > 0)
    );

    console.log(`✅ Found ${tweetData.length} tweet bodies and IDs:\n`);
    tweetData.forEach((data, i) => {
      console.log(`[${i + 1}] Tweet ID: ${data.tweetId}\nBody: ${data.body}\n`);
    });
  } catch (err) {
    console.error('❌ Error scraping .tweet-body:', err.message);
  } finally {
    await browser.close();
  }
}

scrapeTweetBodies(TWEET_URL);
