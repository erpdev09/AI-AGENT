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

   
    let hasMore = await page.$('.show-more');

 
    while (hasMore) {
      console.log('⏩ Clicking "Show More" to load more replies...');
      

      await page.click('.show-more');
      

      await page.waitForSelector('#r.replies .tweet-body', { timeout: 10000 });


      tweetBodies = await page.$$eval('#r.replies .tweet-body', (nodes) =>
        nodes.map(el => el.innerText.trim()).filter(text => text.length > 0)
      );

      allTweetBodies = [...allTweetBodies, ...tweetBodies];

      console.log(`✅ Found ${tweetBodies.length} more tweet bodies`);
      hasMore = await page.$('.show-more');
    }

 
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
