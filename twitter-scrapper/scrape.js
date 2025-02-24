const fs = require('fs');
const path = require('path');

async function scrapeTweets(page, searchQuery) {
    console.log("Opening search bar...");
    await page.waitForSelector('a[href="/explore"]', { visible: true });
    await page.click('a[href="/explore"]');

    console.log("Typing search query...");
    await page.waitForSelector('input[aria-label="Search query"]', { visible: true });
    const searchInput = await page.$('input[aria-label="Search query"]');
    await searchInput.click();
    await searchInput.type(searchQuery, { delay: 100 });
    await page.keyboard.press('Enter');

    console.log("Waiting for search results...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("Navigating to 'Latest' tab...");
    await page.waitForSelector('a[role="tab"][href*="f=live"]', { visible: true });
    await page.click('a[role="tab"][href*="f=live"]');
    await new Promise(resolve => setTimeout(resolve, 3000));

    let tweetData = [];

    const tweets = await page.$$('article[data-testid="tweet"]');

    for (const tweet of tweets) {
        try {
            console.log("Clicking on tweet to open thread...");
            await tweet.click();
            await new Promise(resolve => setTimeout(resolve, 3000));

            const threadData = await page.evaluate(() => {
                const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
                const originalTweet = articles[0];
                const originalTweetData = {
                    text: originalTweet?.querySelector('div[data-testid="tweetText"]')?.innerText || '',
                    timestamp: originalTweet?.querySelector('time')?.getAttribute('datetime') || '',
                    author: originalTweet?.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || '',
                    username: originalTweet?.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[1] || '',
                    views: originalTweet?.querySelector('div[data-testid="analyticsButton"]')?.innerText || '0',
                };

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

            console.log("Returning to search results...");
            await page.goBack();
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.error("Error processing tweet:", error);
            continue;
        }
    }

    console.log("Extracted tweet threads:");
    console.log(JSON.stringify(tweetData, null, 2));

    // Save to JSON file
    const tempFolderPath = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath);
    }
    
    const filePath = path.join(tempFolderPath, 'scraped_tweets.json');
    fs.writeFileSync(filePath, JSON.stringify(tweetData, null, 2));
    console.log(`Data saved to ${filePath}`);

    return tweetData;
}

module.exports = scrapeTweets;