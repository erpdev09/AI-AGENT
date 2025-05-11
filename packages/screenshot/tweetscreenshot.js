const puppeteer = require('puppeteer');

// The tweet URL to capture
const tweetUrl = 'https://x.com/Cristiano/status/1917327623421563126';

async function takeScreenshot(url) {
  console.log(`Taking screenshot of: ${url}`);
  
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: false,  // Show the browser window
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport size for consistent screenshots
    await page.setViewport({
      width: 1800,
      height: 900,
      deviceScaleFactor: 2 // Higher resolution
    });
    
    // Navigate to the tweet
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for the tweet to load
    // The article element typically contains the tweet content
    await page.waitForSelector('article', { timeout: 70000 });
    
    console.log('Tweet loaded, waiting an additional 5 seconds for complete rendering...');
    
    // Wait 5 seconds using setTimeout wrapped in a promise
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Now locating the tweet container...');
    
    // Find the tweet element
    const tweetElement = await page.$('article');
    
    if (!tweetElement) {
      throw new Error('Could not find the tweet element');
    }
    
    // Generate filename based on tweet ID
    const tweetId = url.split('/').pop();
    const fileName = `tweet_${tweetId}.png`;
    
    console.log(`Taking screenshot and saving as ${fileName}...`);
    
    // Take screenshot of just that element
    await tweetElement.screenshot({
      path: fileName,
      omitBackground: true
    });
    
    console.log(`Screenshot saved successfully as ${fileName}`);
    
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    // Close the browser
    await browser.close();
  }
}


takeScreenshot(tweetUrl).catch(console.error);

