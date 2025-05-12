const puppeteer = require('puppeteer');

const tweetUrl = 'https://nitter.net/dylankoren/status/1922000031873114458';

async function takeScreenshotOfDivContainingTweetLink(url) {
  console.log(`Taking screenshot of the first div containing a tweet-link on: ${url}`);

  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless operation
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set a reasonable viewport size
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2
    });

    // Navigate to the URL and wait until the network is mostly idle
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Construct an XPath to find the parent div of any <a> element with class "tweet-link"
    // This will find the first such div on the page
    const targetDivXPath = `//a[@class="tweet-link"]/parent::div`;

    console.log(`Waiting for the first element matching XPath: ${targetDivXPath}`);

    // Wait for the element to appear on the page
    await page.waitForSelector(`xpath/${targetDivXPath}`, { timeout: 60000 });

    console.log('Target div found, waiting extra time for rendering...');
    // Add a small delay to ensure all content within the div is rendered
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get the element handle for the first found div using the XPath
    const divToScreenshot = await page.$(`xpath/${targetDivXPath}`);

    // Check if the element was found
    if (!divToScreenshot) {
      throw new Error(`Could not find the div element with XPath after waiting: ${targetDivXPath}`);
    }

    // Find the specific tweet link within the found div to generate a filename
    const tweetLinkElement = await divToScreenshot.$('a.tweet-link');
    if (!tweetLinkElement) {
         throw new Error(`Could not find a tweet-link within the targeted div.`);
    }

    // Extract the href attribute from the found tweet link
    const linkHref = await page.evaluate(el => el.getAttribute('href'), tweetLinkElement);

    // Generate a filename based on the tweet ID from the href
    const fileName = `${linkHref.split('/').pop().split('#')[0]}.png`;

    // Take a screenshot of the specific div element
    await divToScreenshot.screenshot({
      path: fileName,
      omitBackground: true // Omit background to get a transparent background if the div has none
    });

    console.log(`Screenshot of the div saved successfully as ${fileName}`);
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    // Close the browser instance
    await browser.close();
  }
}

// Call the function with the target URL
takeScreenshotOfDivContainingTweetLink(tweetUrl).catch(console.error);
