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
                const originalAuthor = originalTweet?.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || 'Unknown';
                const originalTweetText = originalTweet?.querySelector('div[data-testid="tweetText"]')?.innerText || '';

                const replies = articles.slice(1).map(reply => {
                    const replyAuthor = reply.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || 'Unknown';
                    const replyText = reply.querySelector('div[data-testid="tweetText"]')?.innerText || '';
                    return {
                        text: `${replyText} by ${replyAuthor}`
                    };
                });

                return {
                    originalTweet: {
                        text: `${originalTweetText} by ${originalAuthor}`
                    },
                    replies: replies
                };
            });

            if (threadData.originalTweet.text) {
                tweetData.push(threadData);

                // Add reply functionality
                console.log("Attempting to reply to tweet...");
                try {
                    // Wait for reply input field
                    await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { visible: true, timeout: 5000 });
                    const replyBox = await page.$('div[role="textbox"][data-testid="tweetTextarea_0"]');
                    
                    // Click and type the reply
                    await replyBox.click();
                    await page.keyboard.type('hehaha yeah', { delay: 100 });

                    // Wait for tweet button and click it
                    await page.waitForSelector('button[data-testid="tweetButton"]', { visible: true, timeout: 5000 });
                    await page.click('button[data-testid="tweetButton"]');
                    
                    console.log("Successfully posted reply: 'hehaha yeah'");
                    // Wait for reply to process
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (replyError) {
                    console.error("Failed to post reply:", replyError);
                }
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