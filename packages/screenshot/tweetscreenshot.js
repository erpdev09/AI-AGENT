const puppeteer = require('puppeteer');

const tweetUrl = 'https://nitter.net/dylankoren/status/1922000031873114458';

async function takeScreenshotOfDivContainingLink(url) {
  console.log(`Taking screenshot of div containing the specific link on: ${url}`);

  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless operation
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Construct an XPath to find the div that directly contains an <a> with the specified attributes.
    const targetDivXPath = `//a[@class="tweet-link" and @href="/JamesLucasIT/status/1921602255997874452#m"]/parent::div`;

    console.log(`Waiting for the element with XPath: ${targetDivXPath}`);

    // Use page.waitForSelector with the 'xpath/' prefix in newer Puppeteer versions to wait for the element.
    await page.waitForSelector(`xpath/${targetDivXPath}`, { timeout: 60000 });

    console.log('Target div found, waiting extra time for rendering...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get the element handle for the found div using page.$ with the 'xpath/' prefix.
    const divToScreenshot = await page.$(`xpath/${targetDivXPath}`);

    if (!divToScreenshot) {
      throw new Error(`Could not find the div element with XPath after waiting: ${targetDivXPath}`);
    }

    // Extract a relevant part for the filename, maybe from the href
    const linkHref = await page.evaluate(el => el.querySelector('a.tweet-link').getAttribute('href'), divToScreenshot);
    const fileName = `${linkHref.split('/').pop().split('#')[0]}.png`;

    await divToScreenshot.screenshot({
      path: fileName,
      omitBackground: true
    });

    console.log(`Screenshot of the div saved successfully as ${fileName}`);
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
}

// You might need to change this URL if the link is on a different Nitter page
takeScreenshotOfDivContainingLink(tweetUrl).catch(console.error);