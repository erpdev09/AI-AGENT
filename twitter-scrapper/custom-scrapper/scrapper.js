const puppeteer = require('puppeteer');

(async () => {
 
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, 
    args: ['--start-maximized'], 
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('https://nitter.net/search?f=tweets&q=%28from%3ASuhaimz11%29+%28to%3Aelisabethxbt%29+&since=&until=&near=');

  // Wait for the timeline items to load
  await page.waitForSelector('.timeline-item');

  // Scrape each timeline-item
  const timelineItems = await page.evaluate(() => {
    const itemElements = document.querySelectorAll('.timeline-item');
    const itemData = [];

    itemElements.forEach((item) => {
      const tweetContent = item.querySelector('.tweet-body')?.innerText || '';
      const userName = item.querySelector('.username')?.innerText || '';
      const tweetDate = item.querySelector('.datetime')?.getAttribute('title') || '';
      const tweetLink = item.querySelector('.tweet-body a')?.href || '';
      const tweetLinkExtra = item.querySelector('.tweet-link')?.href || '';  

      itemData.push({ tweetContent, userName, tweetDate, tweetLink, tweetLinkExtra });
    });

    return itemData;
  });

  timelineItems.forEach((item, index) => {
    console.log(`Tweet ${index + 1}:`);
    console.log(`User: ${item.userName}`);
    console.log(`Tweet Content: ${item.tweetContent}`);
    console.log(`Date: ${item.tweetDate}`);
    console.log(`Tweet Link (from tweet-body): ${item.tweetLink}`);
    console.log(`Tweet Link (from tweet-link): ${item.tweetLinkExtra}`);
    console.log('----------------------');
  });
  await browser.close();
})();
