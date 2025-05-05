const puppeteer = require('puppeteer');
const pool = require('../../config/dbconnect');

async function checkAndUpdateConstraints() {
  const client = await pool.connect();
  try {
    console.log('Checking database constraints...');

    const dropConstraintQuery = `
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'tweets1' 
      AND constraint_name = 'tweets1_tweet_link_key';
    `;
    const constraintCheck = await client.query(dropConstraintQuery);

    if (constraintCheck.rowCount > 0) {
      console.log('Found unique constraint on tweet_link, removing it...');
      await client.query('ALTER TABLE tweets1 DROP CONSTRAINT tweets1_tweet_link_key;');
      console.log('Constraint removed successfully');
    } else {
      console.log('No unique constraint on tweet_link found');
    }

    // Ensure tweet_id column exists (manual schema update is still recommended)
    await client.query(`ALTER TABLE tweets1 ADD COLUMN IF NOT EXISTS tweet_id TEXT;`);

    // Optional: Add unique constraint on tweet_id
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'tweets1' 
          AND constraint_name = 'unique_tweet_id'
        ) THEN
          ALTER TABLE tweets1 ADD CONSTRAINT unique_tweet_id UNIQUE (tweet_id);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.error('Error updating constraints:', error);
  } finally {
    client.release();
  }
}

async function insertTweet(tweet) {
  const client = await pool.connect();

  try {
    const checkQuery = 'SELECT 1 FROM tweets1 WHERE tweet_id = $1';
    const checkResult = await client.query(checkQuery, [tweet.tweetId]);

    if (checkResult.rowCount === 0) {
      const insertQuery = `
        INSERT INTO tweets1 (
          tweet_id,
          user_name, 
          tweet_content, 
          tweet_link, 
          tweet_link_extra, 
          is_replied_tweet, 
          is_direct_tag
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING tweet_id;
      `;
      const values = [
        tweet.tweetId,
        tweet.userName,
        tweet.tweetContent,
        tweet.tweetLink,
        tweet.tweetLinkExtra,
        tweet.isRepliedTweet,
        tweet.isDirectTag
      ];

      const result = await client.query(insertQuery, values);
      console.log(`✅ Inserted tweet with ID: ${result.rows[0].tweet_id}`);
    } else {
      console.log('⚠️ Tweet already exists (same tweet_id), skipping insert.');
    }
  } catch (error) {
    console.error('❌ Error inserting tweet:', error);
  } finally {
    client.release();
  }
}

(async () => {
  await checkAndUpdateConstraints();

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('https://nitter.net/dylankoren/with_replies');
  await page.waitForSelector('.timeline-item');

  const timelineItems = await page.evaluate(() => {
    const itemElements = document.querySelectorAll('.timeline-item');
    const itemData = [];

    itemElements.forEach((item) => {
      const tweetContent = item.querySelector('.tweet-body')?.innerText.trim() || 'No content';
      const userName = item.querySelector('.username')?.innerText.trim() || 'Unknown user';

      let tweetLink = item.querySelector('.tweet-body a')?.href || '';
      let tweetLinkExtra = item.querySelector('.tweet-link')?.href || '';
      if (!tweetLinkExtra) tweetLinkExtra = tweetLink;

      tweetLink = tweetLink.replace('nitter.net', 'x.com').replace(/#m$/, '');
      tweetLinkExtra = tweetLinkExtra.replace('nitter.net', 'x.com').replace(/#m$/, '');

      let tweetId = null;
      const parts = tweetLinkExtra.split('/status/');
      if (parts.length === 2) {
        tweetId = parts[1];
      }

      let cleanedTweetContent = tweetContent;
      const replyToIndex = tweetContent.indexOf('Replying to');
      const atElisabethIndex = tweetContent.indexOf('@Elisabethxbt');

      if (replyToIndex !== -1) {
        cleanedTweetContent = tweetContent.slice(replyToIndex + 'Replying to'.length).trim();
      } else if (atElisabethIndex !== -1) {
        cleanedTweetContent = tweetContent.slice(atElisabethIndex + '@Elisabethxbt'.length).trim();
      }

      itemData.push({
        tweetContent: cleanedTweetContent,
        userName,
        tweetLink,
        tweetLinkExtra,
        tweetId,
      });
    });

    return itemData;
  });

  console.log('📝 Extracted timeline items:');
  console.dir(timelineItems, { depth: null });

  for (const item of timelineItems) {
    const isRepliedTweet = item.tweetContent.includes('@');
    const isDirectTag = !isRepliedTweet;

    const tweetData = {
      tweetId: item.tweetId,
      userName: item.userName,
      tweetContent: item.tweetContent,
      tweetLink: item.tweetLink,
      tweetLinkExtra: item.tweetLinkExtra,
      isRepliedTweet,
      isDirectTag,
    };

    console.log('➡️ Processing tweet:', tweetData.tweetId);
    await insertTweet(tweetData);
  }

  await browser.close();
})();
