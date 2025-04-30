const { analyzeAndSaveTweets } = require('../client/clientreply');
const pool = require('../config/dbconnect');

const isMac = process.platform === 'darwin';
const modifierKey = isMac ? 'Meta' : 'Control';

async function scrapeTweets(page, searchQuery) {
    console.log("Navigating to search...");
    await goToLatestSearch(page, searchQuery);

    let tweetData = [];
    const tweets = await page.$$('article[data-testid="tweet"]');

    for (const tweet of tweets) {
        try {
            await tweet.click();
            await page.waitForNetworkIdle({ timeout: 5000 });

            const threadData = await extractThreadData(page);
            if (threadData.originalTweet.text) {
                tweetData.push(threadData);
                await saveTweetToDatabase(threadData);
            }

            await page.goBack();
            await page.waitForNetworkIdle({ timeout: 5000 });
        } catch (err) {
            console.error("Error processing tweet:", err);
        }
    }

    if (tweetData.length === 0) {
        console.log("No tweets scraped.");
        return tweetData;
    }

    console.log("Analyzing tweets...");
    await analyzeAndSaveTweets();
    const aiReplies = await loadAIRepliesFromDB();

    const freshTweets = await page.$$('article[data-testid="tweet"]');
    for (const [index, tweet] of freshTweets.entries()) {
        if (index >= tweetData.length) break;
        try {
            await tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await tweet.click();
            await page.waitForNetworkIdle({ timeout: 5000 });

            const thread = tweetData[index];
            const aiReply = aiReplies.find(r => r.originalTweet.tweetId.toString() === thread.originalTweet.tweetId.toString());
            const replyText = aiReply?.aiReply || "Looks like the AI didn’t generate a reply for this one. Here’s a default response!";

            await attemptReply(page, replyText);
            await page.goBack();
            await page.waitForNetworkIdle({ timeout: 5000 });
        } catch (err) {
            console.error("Error replying to tweet:", err);
        }
    }

    return tweetData;
}

async function goToLatestSearch(page, query) {
    await page.waitForSelector('a[href="/explore"]', { visible: true });
    await page.click('a[href="/explore"]');

    await page.waitForSelector('input[aria-label="Search query"]', { visible: true });
    const input = await page.$('input[aria-label="Search query"]');
    await input.click();
    await input.type(query, { delay: 100 });
    await page.keyboard.press('Enter');

    await page.waitForNetworkIdle({ timeout: 10000 });

    await page.waitForSelector('a[role="tab"][href*="f=live"]', { visible: true });
    await page.click('a[role="tab"][href*="f=live"]');
    await page.waitForNetworkIdle({ timeout: 5000 });
}

async function extractThreadData(page) {
    return await page.evaluate(() => {
        const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        const getText = el => el?.innerText || '';
        const getId = el => el?.getAttribute('data-tweet-id') || Math.floor(Math.random() * 1e18);

        const original = articles[0];
        const originalAuthor = getText(original?.querySelector('div[data-testid="User-Name"]')).split('\n')[0] || 'Unknown';
        const originalText = getText(original?.querySelector('div[data-testid="tweetText"]'));
        const originalId = getId(original);

        const replies = articles.slice(1).map(reply => {
            const author = getText(reply.querySelector('div[data-testid="User-Name"]')).split('\n')[0] || 'Unknown';
            const text = getText(reply.querySelector('div[data-testid="tweetText"]'));
            return {
                replyId: getId(reply),
                text: `${text} by ${author}`
            };
        });

        return {
            originalTweet: {
                tweetId: originalId,
                text: `${originalText} by ${originalAuthor}`,
                author: originalAuthor
            },
            replies
        };
    });
}

async function saveTweetToDatabase({ originalTweet, replies }) {
    const client = await pool.connect();
    try {
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

        console.log(`Saved tweet ${originalTweet.tweetId}`);
    } catch (err) {
        console.error("DB error:", err);
    } finally {
        client.release();
    }
}

async function loadAIRepliesFromDB() {
    try {
        const res = await pool.query(`
            SELECT t.tweet_id, t.text AS original_text, t.author AS original_author, r.text AS ai_reply
            FROM tweets t
            JOIN replies r ON t.tweet_id = r.tweet_id
            WHERE r.is_ai_reply = TRUE AND r.author = 'AI_Bot'
            ORDER BY r.reply_id DESC;
        `);

        return res.rows.map(row => ({
            originalTweet: {
                tweetId: row.tweet_id,
                text: `${row.original_text} by ${row.original_author}`,
            },
            aiReply: row.ai_reply
        }));
    } catch (err) {
        console.error("DB load error:", err);
        return [];
    }
}

async function attemptReply(page, replyText) {
    try {
        await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { visible: true, timeout: 10000 });
        const replyBox = await page.$('div[role="textbox"][data-testid="tweetTextarea_0"]');

        await replyBox.focus();
        await page.keyboard.type(replyText, { delay: 50 });

        await page.keyboard.down(modifierKey);
        await page.keyboard.press('Enter');
        await page.keyboard.up(modifierKey);

        await page.waitForNetworkIdle({ timeout: 5000 });
        console.log(`Posted reply: '${replyText}'`);
    } catch (err) {
        console.error("Reply error:", err);
        await page.screenshot({ path: 'temp/reply_error.png' });
    }
}

module.exports = scrapeTweets;
