const fs = require('fs');
const path = require('path');
const { analyzeAndSaveTweets } = require('../client/clientreply');

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

    // Scrape tweets
    let tweetData = [];
    let tweets = await page.$$('article[data-testid="tweet"]');

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
            }

            console.log("Returning to search results...");
            await page.goBack();
            await page.waitForNetworkIdle({ timeout: 5000 });
        } catch (error) {
            console.error("Error processing tweet:", error);
            continue;
        }
    }

    if (tweetData.length === 0) {
        console.log("No tweets scraped. Exiting...");
        return tweetData;
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

    // Analyze tweets and generate replies
    console.log("Analyzing tweets and generating replies...");
    await analyzeAndSaveTweets();

    // Load AI-generated replies
    const toBeReplied = loadToBeReplied();
    if (toBeReplied.length === 0) {
        console.log("No replies generated. Exiting...");
        return tweetData;
    }

    // Reply to tweets
    tweets = await page.$$('article[data-testid="tweet"]'); // Re-query tweets to avoid stale elements
    for (const [index, tweet] of tweets.entries()) {
        if (index >= toBeReplied.length) break; // Avoid out-of-bounds access

        try {
            console.log("Clicking on tweet to open thread for replying...");
            await tweet.click();
            await page.waitForNetworkIdle({ timeout: 5000 });

            const threadData = tweetData[index];
            if (threadData.originalTweet.text) {
                console.log("Attempting to reply to tweet...");
                const replyText = toBeReplied[index]?.aiReply || "No AI reply available.";
                await attemptReply(page, replyText);
            }

            console.log("Returning to search results...");
            await page.goBack();
            await page.waitForNetworkIdle({ timeout: 5000 });
        } catch (error) {
            console.error("Error replying to tweet:", error);
            continue;
        }
    }

    return tweetData;
}

function loadToBeReplied() {
    try {
        const filePath = path.join(__dirname, 'temp', 'tobereplied.json');
        if (!fs.existsSync(filePath)) {
            console.error("Error: tobereplied.json not found!");
            return [];
        }
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading tobereplied.json:", error);
        return [];
    }
}

async function attemptReply(page, replyText) {
    try {
        await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { visible: true, timeout: 10000 });
        const replyBox = await page.$('div[role="textbox"][data-testid="tweetTextarea_0"]');
        
        await replyBox.focus();
        await page.keyboard.type(replyText, { delay: 50 });

        await page.keyboard.down('Control');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Control');

        await page.waitForNetworkIdle({ timeout: 5000 });
        console.log(`Successfully posted reply: '${replyText}' using Ctrl+Enter`);
    } catch (replyError) {
        console.error("Failed to post reply:", replyError);
        await page.screenshot({ path: 'temp/reply_error.png' });
        throw replyError;
    }
}

module.exports = scrapeTweets;