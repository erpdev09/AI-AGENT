const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Set viewport for better visibility
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Opening Twitter login page...");
    await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

    // Enter username
    console.log("Entering username...");
    await page.waitForSelector('input[name="text"]', { visible: true });
    await page.type('input[name="text"]', 'Elisabe38130500');
    await page.keyboard.press('Enter');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Enter password
    console.log("Entering password...");
    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', 'Takemyheart@1');
    await page.keyboard.press('Enter');

    await new Promise(resolve => setTimeout(resolve, 5000)); 

    console.log("Logged in successfully");

    // Wait for the search icon (open search box)
    console.log("Opening search bar...");
    await page.waitForSelector('a[href="/explore"]', { visible: true });
    await page.click('a[href="/explore"]');

    // Wait for search input to appear
    await page.waitForSelector('input[aria-label="Search query"]', { visible: true });

    // Click inside search input to make sure it's focused
    console.log("Typing search query...");
    const searchInput = await page.$('input[aria-label="Search query"]');
    await searchInput.click();
    await searchInput.type('@elonmusk', { delay: 100 });

    await page.keyboard.press('Enter');

    // Wait for results to load
    console.log("Waiting for search results...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Click the "Latest" tab
    console.log("Navigating to 'Latest' tab...");
    await page.waitForSelector('a[role="tab"][href*="f=live"]', { visible: true });
    await page.click('a[role="tab"][href*="f=live"]');

    // Wait for tweets to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract tweets
    console.log("Extracting latest tweets...");
    const tweets = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('article div[lang]'))
            .slice(0, 5)  // Get the first 5 tweets
            .map(tweet => tweet.innerText);
    });

    console.log("Latest tweets about @elonmusk:");
    console.log(tweets);

    console.log("Script execution completed!");

    // Keep browser open for testing
    // await browser.close();
})();
