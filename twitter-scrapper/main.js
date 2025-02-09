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
    
    // Navigate to search page
    console.log("Opening search bar...");
    await page.waitForSelector('a[href="/explore"]', { visible: true });
    await page.click('a[href="/explore"]');
    
    // Wait for search input to appear
    await page.waitForSelector('input[aria-label="Search query"]', { visible: true });
    
    // Click inside search input to make sure it's focused
    console.log("Typing search query...");
    const searchInput = await page.$('input[aria-label="Search query"]');
    await searchInput.click();
    await searchInput.type('@Elisabe38130500', { delay: 100 });
    
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
    
    let tweetData = [];
    
    // Get all tweet articles on the page
    const tweets = await page.$$('article[data-testid="tweet"]');
    
    for (const tweet of tweets) {
        try {
            // Click on the tweet to open the full thread
            console.log("Clicking on tweet to open thread...");
            await tweet.click();
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for thread to load
            
            // Extract the tweet thread data
            const threadData = await page.evaluate(() => {
                // Get all tweets in the thread
                const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
                
                // Find the original tweet (usually the first one)
                const originalTweet = articles[0];
                const originalTweetData = {
                    text: originalTweet?.querySelector('div[data-testid="tweetText"]')?.innerText || '',
                    timestamp: originalTweet?.querySelector('time')?.getAttribute('datetime') || '',
                    author: originalTweet?.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || '',
                    username: originalTweet?.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[1] || '',
                    views: originalTweet?.querySelector('div[data-testid="analyticsButton"]')?.innerText || '0',
                };
                
                // Get all replies (excluding the original tweet)
                const replies = articles.slice(1).map(reply => ({
                    text: reply.querySelector('div[data-testid="tweetText"]')?.innerText || '',
                    timestamp: reply.querySelector('time')?.getAttribute('datetime') || '',
                    author: reply.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || '',
                    username: reply.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[1] || '',
                }));
                
                return {
                    originalTweet: originalTweetData,
                    replies: replies
                };
            });
            
            if (threadData.originalTweet.text) {
                tweetData.push(threadData);
            }
            
            // Go back to the search results
            console.log("Returning to search results...");
            await page.goBack();
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to load
            
        } catch (error) {
            console.error("Error processing tweet:", error);
            continue;
        }
    }
    
    console.log("Extracted tweet threads:");
    console.log(JSON.stringify(tweetData, null, 2));
    
    console.log("Script execution completed!");
    
    // Keep browser open for testing
    // await browser.close();
})();