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
    await page.waitForNetworkIdle({ timeout: 10000 });

    console.log("Navigating to 'Latest' tab...");
    await page.waitForSelector('a[role="tab"][href*="f=live"]', { visible: true });
    await page.click('a[role="tab"][href*="f=live"]');
    await page.waitForNetworkIdle({ timeout: 5000 });

    let tweetData = [];
    const tweets = await page.$$('article[data-testid="tweet"]');

    for (const tweet of tweets) {
        try {
            console.log("Clicking on tweet to open thread...");
            await tweet.click();
            await page.waitForNetworkIdle({ timeout: 5000 });

            const threadData = await page.evaluate(() => {
                const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
                const originalTweet = articles[0];
                const originalAuthor = originalTweet?.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || 'Unknown';
                const originalTweetText = originalTweet?.querySelector('div[data-testid="tweetText"]')?.innerText || '';

                const replies = articles.slice(1).map(reply => {
                    const replyAuthor = reply.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || 'Unknown';
                    const replyText = reply.querySelector('div[data-testid="tweetText"]')?.innerText || '';
                    return { text: `${replyText} by ${replyAuthor}` };
                });

                return {
                    originalTweet: { text: `${originalTweetText} by ${originalAuthor}` },
                    replies: replies
                };
            });

            if (threadData.originalTweet.text) {
                tweetData.push(threadData);

                console.log("Attempting to reply to tweet...");
                await attemptReply(page);
            }

            console.log("Returning to search results...");
            await page.goBack();
            await page.waitForNetworkIdle({ timeout: 5000 });
        } catch (error) {
            console.error("Error processing tweet:", error);
            continue;
        }
    }

    console.log("Extracted tweet threads:");
    console.log(JSON.stringify(tweetData, null, 2));

    const tempFolderPath = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath);
    }

    const filePath = path.join(tempFolderPath, 'scraped_tweets.json');
    fs.writeFileSync(filePath, JSON.stringify(tweetData, null, 2));
    console.log(`Data saved to ${filePath}`);

    return tweetData;
}

async function attemptReply(page) {
    try {
        // Wait for the reply textbox to be visible and ready
        await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { visible: true, timeout: 10000 });
        const replyBox = await page.$('div[role="textbox"][data-testid="tweetTextarea_0"]');
        
        // Focus the textbox and type the reply
        await replyBox.focus();
        await page.keyboard.type('hehaha yeah', { delay: 50 });

        // Submit the reply using Ctrl+Enter
        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');

        // Wait for the reply to post
        await page.waitForNetworkIdle({ timeout: 5000 });
        console.log("Successfully posted reply: 'hehaha yeah' using Ctrl+Enter");
    } catch (replyError) {
        console.error("Failed to post reply:", replyError);
        await page.screenshot({ path: 'temp/reply_error.png' });
        throw replyError;
    }
}

module.exports = scrapeTweets;
