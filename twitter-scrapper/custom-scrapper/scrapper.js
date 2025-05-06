const puppeteer = require('puppeteer');
const pool = require('../../config/dbconnect');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { videoDownloader } = require('../../packages/twitterapi.io/main/scrapevideo'); // Import the video downloader module


const API_KEY = '';

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

    await client.query(`ALTER TABLE tweets1 ADD COLUMN IF NOT EXISTS tweet_id TEXT;`);

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

function extractTweetIdFromUrl(url) {
  const parts = url.split('/status/');
  if (parts.length === 2) {
    return parts[1].split(/[#?]/)[0]; // Remove hash or query
  }
  return null;
}

/**
 * Downloads a video file from the given URL and saves it to disk
 * @param {string} videoUrl - The URL of the video to download
 * @param {string} tweetId - The tweet ID to use in the filename
 * @returns {Promise<string|null>} - The path to the saved file or null if failed
 */
async function downloadVideo(videoUrl, tweetId) {
  try {
    console.log(`🔽 Downloading video from: ${videoUrl}`);
    
    const videosDir = path.join(__dirname, 'tweet_videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir);
    }
    
    const videoPath = path.join(videosDir, `${tweetId}.mp4`);
    
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(videoPath);
    
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      
      writer.on('close', () => {
        if (!error) {
          console.log(`✅ Video saved to: ${videoPath}`);
          resolve(videoPath);
        }
      });
    });
  } catch (error) {
    console.error(`❌ Error downloading video: ${error.message}`);
    return null;
  }
}

(async () => {
  await checkAndUpdateConstraints();

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox'],
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

      tweetLink = tweetLink.replace(/#m$/, '');
      tweetLinkExtra = tweetLinkExtra.replace(/#m$/, '');

      let tweetId = null;
      const parts = tweetLinkExtra.split('/status/');
      if (parts.length === 2) {
        tweetId = parts[1].split(/[#?]/)[0];
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

  const keywords = [
    'swap this coin',
    'swap this coin from this image',
    'buy this coin',
    'get this coin'
  ];

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

    const hasKeyword = keywords.some(keyword =>
      item.tweetContent.toLowerCase().includes(keyword.toLowerCase())
    );

    const isVideoOrClipTweet = /video|clip/i.test(item.tweetContent);

    if (hasKeyword && !isVideoOrClipTweet) {
      console.log('🔍 Found keyword in tweet, checking for images...');

      try {
        await page.goto(item.tweetLinkExtra);
        await page.waitForSelector('.timeline-item', { timeout: 10000 });

        const imageUrls = await page.evaluate(() => {
          const attachmentDiv = document.querySelector('.attachments');
          if (!attachmentDiv) return [];

          const images = attachmentDiv.querySelectorAll('img');
          return Array.from(images).map(img => img.src);
        });

        if (imageUrls.length > 0) {
          console.log(`🖼️ Found ${imageUrls.length} images in tweet`);

          const imagesDir = path.join(__dirname, 'tweet_images');
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir);
          }

          for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];
            const imagePath = path.join(imagesDir, `${item.tweetId}_${i}.jpg`);

            try {
              const response = await page.goto(imageUrl);
              const imageBuffer = await response.buffer();
              fs.writeFileSync(imagePath, imageBuffer);
              console.log(`✅ Saved image: ${imagePath}`);
            } catch (error) {
              console.error(`❌ Error downloading image ${imageUrl}:`, error);
            }
          }
        } else {
          console.log('⚠️ No images found in tweet');
        }
      } catch (error) {
        console.error('❌ Error processing tweet images:', error);
      }
    } else if (isVideoOrClipTweet) {
      console.log(`🎥 Found video/clip-related tweet: ${item.tweetLinkExtra}`);

      try {
        await page.goto(item.tweetLinkExtra, { waitUntil: 'networkidle2' });

        const currentUrl = page.url();
        const extractedTweetId = extractTweetIdFromUrl(currentUrl);

        if (extractedTweetId) {
          console.log(`🆔 Extracted tweet ID: ${extractedTweetId}`);

          tweetData.tweetId = extractedTweetId;
          await insertTweet(tweetData);
          
          // Get tweet ID for video download
          const tweetId = await page.evaluate(() => {
            const linkElement = document.querySelector('.timeline-item a.tweet-link');
            if (!linkElement) return null;
            
            // Extract just the ID from the URL
            const href = linkElement.href;
            const parts = href.split('/status/');
            if (parts.length === 2) {
              return parts[1].split(/[#?]/)[0];
            }
            return null;
          });

          if (tweetId) {
            console.log(`🔢 Video/Clip tweet ID: ${tweetId}`);
            
            // Now use the videoDownloader module to get the video URL
            const videoVariant = await videoDownloader(API_KEY, tweetId);
            
            if (videoVariant && videoVariant.url) {
              console.log(`🎬 Found video URL: ${videoVariant.url}`);
              
              // Download the video
              await downloadVideo(videoVariant.url, tweetId);
            } else {
              console.log('⚠️ No high-quality video found for this tweet');
            }
          }
        } else {
          console.log('⚠️ Could not extract tweet ID from URL');
        }
      } catch (error) {
        console.error('❌ Error processing video/clip tweet:', error);
      }
    }
  }

  await browser.close();
})();