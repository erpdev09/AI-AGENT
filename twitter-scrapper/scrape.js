const { analyzeAndSaveTweets } = require('../client/clientreply');
const pool = require('../config/dbconnect');

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
                const originalTweetId = originalTweet?.getAttribute('data-tweet-id') || Math.floor(Math.random() * 1e18);

                const replies = articles.slice(1).map(reply => {
                    const replyAuthor = reply.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || 'Unknown';
                    const replyText = reply.querySelector('div[data-testid="tweetText"]')?.innerText || '';
                    const replyId = reply.getAttribute('data-tweet-id') || Math.floor(Math.random() * 1e18);
                    return { replyId, text: `${replyText} by ${replyAuthor}` };
                });

                return {
                    originalTweet: { tweetId: originalTweetId, text: `${originalTweetText} by ${originalAuthor}`, author: originalAuthor },
                    replies: replies
                };
            });

            if (threadData.originalTweet.text) {
                tweetData.push(threadData);
                await saveTweetToDatabase(threadData);
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

    console.log("Analyzing tweets and generating replies...");
    await analyzeAndSaveTweets();

    // Load AI replies from the database
    const toBeReplied = await loadAIRepliesFromDB();

    // Reply to tweets
    tweets = await page.$$('article[data-testid="tweet"]'); // Re-query to avoid stale elements
    for (const [index, tweet] of tweets.entries()) {
        if (index >= tweetData.length) break;

        try {
            console.log("Clicking on tweet to open thread for replying...");
            await page.waitForSelector('article[data-testid="tweet"]', { visible: true, timeout: 10000 });
            await tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await tweet.click();
            await page.waitForNetworkIdle({ timeout: 5000 });

            const threadData = tweetData[index];
            if (threadData.originalTweet.text) {
                console.log("Attempting to reply to tweet...");
                const aiReplyData = toBeReplied.find(reply => 
                    reply.originalTweet.tweetId.toString() === threadData.originalTweet.tweetId.toString()
                );
                const replyText = aiReplyData?.aiReply || "Looks like the AI didn’t generate a reply for this one. Here’s a default response!";
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

    console.log("Final Scraped Data:", tweetData);
    return tweetData;
}

async function saveTweetToDatabase(threadData) {
    const client = await pool.connect();
    try {
        const { originalTweet, replies } = threadData;

        await client.query(
            `INSERT INTO tweets (tweet_id, text, author) VALUES ($1, $2, $3) ON CONFLICT (tweet_id) DO NOTHING;`,
            [originalTweet.tweetId, originalTweet.text, originalTweet.author]
        );

        for (const reply of replies) {
            await client.query(
                `INSERT INTO replies (tweet_id, text, author) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;`,
                [originalTweet.tweetId, reply.text, reply.text.split(' by ').pop()]
            );
        }

        console.log(`Saved tweet and replies for Tweet ID: ${originalTweet.tweetId}`);
    } catch (err) {
        console.error("Database error:", err);
    } finally {
        client.release();
    }
}

async function loadAIRepliesFromDB() {
    try {
        const query = `
            SELECT t.tweet_id, t.text AS original_text, t.author AS original_author, r.text AS ai_reply
            FROM tweets t
            JOIN replies r ON t.tweet_id = r.tweet_id
            WHERE r.is_ai_reply = TRUE AND r.author = 'AI_Bot'
            ORDER BY r.reply_id DESC; -- Get the latest replies
        `;
        const result = await pool.query(query);

        return result.rows.map(row => ({
            originalTweet: {
                tweetId: row.tweet_id,
                text: `${row.original_text} by ${row.original_author}`,
            },
            aiReply: row.ai_reply
        }));
    } catch (error) {
        console.error("Error loading AI replies from database:", error);
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