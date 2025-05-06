const { analyzeTweets } = require('../client/clientreply');
const pool = require('../config/dbconnect');

const AI_ACCOUNT_NAME = 'Elisabeth'; 

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

      const threadData = await page.evaluate((aiAccountName) => {
        const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        const originalTweet = articles[0];
        const originalAuthor = originalTweet?.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || 'Unknown';
        const originalTweetText = originalTweet?.querySelector('div[data-testid="tweetText"]')?.innerText || '';
        const originalTweetId = originalTweet?.querySelector('time')?.parentElement?.href?.match(/status\/(\d+)/)?.[1] || null;

        if (!originalTweetId) return null;

        const replies = articles.slice(1).map(reply => {
          const replyAuthor = reply.querySelector('div[data-testid="User-Name"]')?.innerText.split('\n')[0] || 'Unknown';
          // Skip replies from the AI's own account
          if (replyAuthor === aiAccountName) return null;
          const replyText = reply.querySelector('div[data-testid="tweetText"]')?.innerText || '';
          const replyId = reply.querySelector('time')?.parentElement?.href?.match(/status\/(\d+)/)?.[1] || null;
          if (!replyId || !replyText) return null;
          return { tweetId: replyId, text: replyText, author: replyAuthor };
        }).filter(reply => reply !== null);

        return {
          originalTweet: { tweetId: originalTweetId, text: originalTweetText, author: originalAuthor },
          replies
        };
      }, AI_ACCOUNT_NAME);

      if (!threadData || !threadData.originalTweet.text || !threadData.originalTweet.tweetId) {
        console.log("⚠️ Invalid tweet data. Skipping.");
        await page.goBack();
        await page.waitForNetworkIdle({ timeout: 5000 });
        continue;
      }

      // Store original tweet and replies
      tweetData.push(threadData);
      await saveTweetToDatabase(threadData);

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

  console.log("Extracted tweet threads and replies:");
  console.log(JSON.stringify(tweetData, null, 2));

  console.log("Analyzing tweets/replies and generating AI responses...");
  const aiReplies = await analyzeTweets();

  // Reply to replies
  tweets = await page.$$('article[data-testid="tweet"]'); // Re-query to avoid stale elements
  for (const [index, tweet] of tweets.entries()) {
    if (index >= tweetData.length) break;

    const threadData = tweetData[index];
    const replies = threadData.replies || [];

    if (replies.length === 0) {
      console.log(`⏭️ No replies found for tweet_id ${threadData.originalTweet.tweetId}. Skipping.`);
      continue;
    }

    try {
      console.log(`Clicking on tweet_id ${threadData.originalTweet.tweetId} to open thread for replying...`);
      await page.waitForSelector('article[data-testid="tweet"]', { visible: true, timeout: 10000 });
      await tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await tweet.click();
      await page.waitForNetworkIdle({ timeout: 5000 });

      for (const reply of replies) {
        // Double-check to skip AI's own replies
        if (reply.author === AI_ACCOUNT_NAME) {
          console.log(`⏭️ Skipping reply_id ${reply.tweetId} by ${AI_ACCOUNT_NAME} (AI's own account).`);
          continue;
        }

        const aiReplyData = aiReplies.find(r => 
          r.originalTweet.tweetId.toString() === reply.tweetId.toString()
        );

        if (!aiReplyData) {
          console.log(`⏭️ AI own replies so alreadyed replied on this tweet ${reply.tweetId}. Skipping.`);
          continue;
        }

        // Check if reply has already been responded to
        const checkQuery = `SELECT ai_has_replied FROM tweets WHERE tweet_id = $1;`;
        const checkResult = await pool.query(checkQuery, [reply.tweetId]);
        if (checkResult.rows.length > 0 && checkResult.rows[0].ai_has_replied) {
          console.log(`⏭️ Reply ID ${reply.tweetId} already replied. Skipping.`);
          continue;
        }

        console.log(`Attempting to reply to reply_id ${reply.tweetId} by ${reply.author}...`);
        // Navigate to the specific reply
        const replySelector = `a[href*="/status/${reply.tweetId}"]`;
        try {
          await page.waitForSelector(replySelector, { visible: true, timeout: 5000 });
          await page.click(replySelector);
          await page.waitForNetworkIdle({ timeout: 5000 });

          await attemptReply(page, aiReplyData.aiReply);

          // Update database after successful reply
          await pool.query(
            `UPDATE tweets 
             SET ai_has_replied = TRUE, ai_replied_text = $1 
             WHERE tweet_id = $2;`,
            [aiReplyData.aiReply, reply.tweetId]
          );
          console.log(`💾 Database updated for reply_id ${reply.tweetId}`);

          await page.goBack();
          await page.waitForNetworkIdle({ timeout: 5000 });
        } catch (error) {
          console.error(`Error replying to reply_id ${reply.tweetId}:`, error);
          await page.screenshot({ path: `temp/reply_error_${reply.tweetId}.png` });
          continue;
        }
      }

      console.log("Returning to search results...");
      await page.goBack();
      await page.waitForNetworkIdle({ timeout: 5000 });
    } catch (error) {
      console.error(`Error processing tweet_id ${threadData.originalTweet.tweetId}:`, error);
      await page.screenshot({ path: `temp/reply_error_${threadData.originalTweet.tweetId}.png` });
      await page.goBack();
      await page.waitForNetworkIdle({ timeout: 5000 });
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

    // Save original tweet
    await client.query(
      `INSERT INTO tweets (tweet_id, the_original_text, author) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (tweet_id) DO NOTHING;`,
      [originalTweet.tweetId, originalTweet.text, originalTweet.author]
    );
    console.log(`Saved original tweet for Tweet ID: ${originalTweet.tweetId}`);

    // Save replies
    for (const reply of replies) {
      await client.query(
        `INSERT INTO tweets (tweet_id, the_original_text, author) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (tweet_id) DO NOTHING;`,
        [reply.tweetId, reply.text, reply.author]
      );
      console.log(`Saved reply for Reply ID: ${reply.tweetId}`);
    }
  } catch (err) {
    console.error("Database error:", err);
  } finally {
    client.release();
  }
}

async function attemptReply(page, replyText) {
  try {
    await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { visible: true, timeout: 10000 });
    const replyBox = await page.$('div[role="textbox"][data-testid="tweetTextarea_0"]');
    
    await replyBox.focus();
    await page.keyboard.type(replyText, { delay: 50 });

    // Determine the platform and use appropriate key combination
    const platform = process.platform;
    console.log(`Detected platform: ${platform}`);

    if (platform === 'darwin') {
      // Mac: Use Cmd + Enter
      await page.keyboard.down('Meta'); // 'Meta' is the Command key
      await page.keyboard.press('Enter');
      await page.keyboard.up('Meta');
      console.log(`Posted reply using Cmd+Enter for Mac: '${replyText}'`);
    } else {
      // Windows/Linux: Use Ctrl + Enter
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
      console.log(`Posted reply using Ctrl+Enter for ${platform}: '${replyText}'`);
    }

    await page.waitForNetworkIdle({ timeout: 5000 });
    console.log(`Successfully posted reply: '${replyText}'`);
  } catch (replyError) {
    console.error("Failed to post reply:", replyError);
    await page.screenshot({ path: 'temp/reply_error.png' });
    throw replyError;
  }
}

module.exports = scrapeTweets;