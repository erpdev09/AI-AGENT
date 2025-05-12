const puppeteer = require('puppeteer');
const pool = require('../../config/dbconnect');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { videoDownloader } = require('../../packages/twitterapi.io/main/scrapevideo'); // Import the video downloader module

const API_KEY = '';

// Function to detect Solana addresses in text
function containsSolanaAddress(text) {
  // Solana addresses are base58-encoded and 32-44 characters long, usually starting with a number or letter
  const solanaAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
  return solanaAddressRegex.test(text);
}

/**
 * Checks parent tweet for Solana address
 * @param {Page} page - Puppeteer page object
 * @param {string} tweetUrl - URL of the reply tweet
 * @returns {Promise<string|null>} - Solana address from parent tweet or null if not found
 */
async function solCheckParent(page, tweetUrl) {
  try {
    console.log(`🔍 Checking parent tweet for Solana address: ${tweetUrl}`);

    await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the tweet thread to load
    await page.waitForSelector('.main-thread', { timeout: 10000 });

    // Get the parent tweet content
    const parentTweetContent = await page.evaluate(() => {
      const parentTweetElement = document.querySelector('.main-thread .timeline-item:first-child .tweet-content');
      if (parentTweetElement) {
        return parentTweetElement.innerText.trim();
      }
      return null;
    });

    if (parentTweetContent && containsSolanaAddress(parentTweetContent)) {
      const solanaAddressMatch = parentTweetContent.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
      console.log(`✅ Found Solana address in parent tweet: ${solanaAddressMatch[0]}`);
      return solanaAddressMatch[0];
    } else {
      console.log('⚠️ No Solana address found in parent tweet');
      return null;
    }
  } catch (error) {
    console.error(`❌ Error checking parent tweet for Solana address: ${error.message}`);
    return null;
  }
}

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

// Function to convert nitter.net URLs to x.com URLs
function convertToXDotCom(url) {
  if (url && url.includes('nitter.net')) {
    return url.replace('nitter.net', 'x.com');
  }
  return url;
}


/**
 * Gets the parent tweet content for a reply tweet
 * @param {Page} page - Puppeteer page object
 * @param {string} tweetUrl - URL of the reply tweet
 * @returns {Promise<string|null>} - Content of the parent tweet or null if not found
 */
async function getParentTweetContent(page, tweetUrl) {
  try {
    console.log(`🔍 Fetching parent tweet content for: ${tweetUrl}`);

    await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the tweet thread to load
    await page.waitForSelector('.main-thread', { timeout: 10000 });

    // Get the parent tweet content (first tweet in the thread)
    const parentTweetContent = await page.evaluate(() => {
      const parentTweetElement = document.querySelector('.main-thread .timeline-item:first-child .tweet-content');
      if (parentTweetElement) {
        return parentTweetElement.innerText.trim();
      }
      return null;
    });

    if (parentTweetContent) {
      console.log(`✅ Found parent tweet content: "${parentTweetContent.substring(0, 50)}${parentTweetContent.length > 50 ? '...' : ''}"`);
      return parentTweetContent;
    } else {
      console.log('⚠️ Parent tweet content not found');
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching parent tweet content: ${error.message}`);
    return null;
  }
}

/**
 * Downloads a video file from the given URL and saves it to disk
 * @param {string} videoUrl - The URL of the video to download
 * @param {string} tweetId - The tweet ID to use in the filename
 * @param {string} tweetContent - The content of the tweet to save alongside the video
 * @returns {Promise<string|null>} - The path to the saved file or null if failed
 */
async function downloadVideo(videoUrl, tweetId, tweetContent) {
  try {
    console.log(`🔢 Downloading video from: ${videoUrl}`);

    // Create main videos directory if it doesn't exist
    const videosDir = path.join(__dirname, 'tweet_videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir);
    }

    // Create a directory for this specific tweet
    const tweetDir = path.join(videosDir, tweetId);
    if (!fs.existsSync(tweetDir)) {
      fs.mkdirSync(tweetDir);
    }

    // Save the tweet content to a text file in the tweet directory
    const tweetContentPath = path.join(tweetDir, `${tweetId}.txt`);
    fs.writeFileSync(tweetContentPath, tweetContent);
    console.log(`📝 Saved tweet content: ${tweetContentPath}`);

    // Path for the video file
    const videoPath = path.join(tweetDir, `${tweetId}.mp4`);

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


/**
 * Checks if the tweet content contains video-related keywords
 * @param {string} content - Tweet content to check
 * @returns {boolean} - True if the content contains video-related keywords
 */
function containsVideoKeywords(content) {
  const videoKeywords = [
    'video',
    'clip',
    'swap from this video',
    'swap this video',
    'buy from this video',
    'get this coin from this video'
  ];

  const lowerContent = content.toLowerCase();
  return videoKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
}

/**
 * Checks if tweet has a video
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if the tweet has video
 */
async function checkForVideo(page) {
  try {
    const hasVideo = await page.evaluate(() => {
      // Check for video elements in the attachments div
      const attachmentsDiv = document.querySelector('.attachments');
      if (!attachmentsDiv) return false;

      // Check for .video-container or video elements
      return !!attachmentsDiv.querySelector('.video-container') ||
             !!attachmentsDiv.querySelector('video');
    });

    return hasVideo;
  } catch (error) {
    console.error('Error checking for video:', error);
    return false;
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

       // Get the href from the image links within this timeline item
       const imageUrls = Array.from(item.querySelectorAll('div.attachments .gallery-row .attachment.image a.still-image'))
         .map(a => a.href)
         .join(', '); // Join multiple image HREFs with a comma and space

      // Append image HREFs to the cleaned tweet content
      if (imageUrls) {
          cleanedTweetContent += ` Image link: ${imageUrls}`;
      }


      itemData.push({
        tweetContent: cleanedTweetContent,
        userName: userName,
        tweetLink: tweetLink,
        tweetLinkExtra: tweetLinkExtra,
        tweetId: tweetId
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
    'get this coin',
    'create a nft'
  ];

  for (const item of timelineItems) {
    const isRepliedTweet = item.tweetContent.includes('@');
    const isDirectTag = !isRepliedTweet;

    // Convert nitter.net URLs to x.com
    const convertedTweetLinkExtra = convertToXDotCom(item.tweetLinkExtra);

    let finalTweetContent = item.tweetContent;
    let hasSolanaAddress = containsSolanaAddress(item.tweetContent);

    // Check if this is a reply tweet and doesn't contain a Solana address
    if (isRepliedTweet && !hasSolanaAddress) {
      console.log('🔄 This is a reply without Solana address, checking parent tweet...');
      const solanaAddress = await solCheckParent(page, item.tweetLinkExtra);
      if (solanaAddress) {
        console.log('➕ Appending Solana address from parent tweet');
        finalTweetContent = `${finalTweetContent} ${solanaAddress}`;
        hasSolanaAddress = true;
      } else {
        console.log('🔍 Fetching parent tweet content for additional context...');
        const parentTweetContent = await getParentTweetContent(page, item.tweetLinkExtra);
        if (parentTweetContent) {
          finalTweetContent = `${finalTweetContent} ${parentTweetContent}`;
        }
      }
    }

    const tweetData = {
      tweetId: item.tweetId,
      userName: item.userName,
      tweetContent: finalTweetContent, // Use finalTweetContent which now includes image HREFs if present
      tweetLink: convertedTweetLinkExtra,
      tweetLinkExtra: convertedTweetLinkExtra,
      isRepliedTweet: isRepliedTweet,
      isDirectTag: isDirectTag
    };

    console.log('➡️ Processing tweet:', tweetData.tweetId);

    await insertTweet(tweetData);

    const hasKeyword = keywords.some(keyword =>
      item.tweetContent.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check for video-related keywords using the new function
    const isVideoOrClipTweet = containsVideoKeywords(item.tweetContent);

    // Skip image/video processing if a Solana address is already present
    if (hasSolanaAddress) {
      console.log('✅ Solana address already captured, skipping image/video processing');
      continue;
    }

    // The image downloading logic remains, but the image HREFs are already appended to tweetContent
    if (hasKeyword && !isVideoOrClipTweet) {
      console.log('🔍 Found keyword in tweet, checking for images...');

      try {
        // Use the original nitter.net URL for web scraping
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

          // Create main images directory if it doesn't exist
          const imagesDir = path.join(__dirname, 'tweet_images');
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir);
          }

          // Create a directory for this specific tweet
          const tweetDir = path.join(imagesDir, item.tweetId);
          if (!fs.existsSync(tweetDir)) {
            fs.mkdirSync(tweetDir);
          }

          // Save the tweet content to a text file in the tweet directory
          // Use finalTweetContent which now includes image HREFs
          const tweetContentPath = path.join(tweetDir, `${item.tweetId}.txt`);
          fs.writeFileSync(tweetContentPath, finalTweetContent);
          console.log(`📝 Saved tweet content: ${tweetContentPath}`);

          // Download and save all images in the tweet directory
          for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];
            const imagePath = path.join(tweetDir, `${item.tweetId}.jpg`); // Added index to filename

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
    } else if (isVideoOrClipTweet || hasKeyword) {
      console.log(`🎥 Found video/clip-related tweet or has keyword: ${item.tweetLinkExtra}`);

      try {
        // Use the original nitter.net URL for web scraping
        await page.goto(item.tweetLinkExtra, { waitUntil: 'networkidle2' });

        // Check if this tweet actually has a video
        const hasVideoContent = await checkForVideo(page);

        if (!hasVideoContent && !isVideoOrClipTweet) {
          console.log('⚠️ This tweet contains keywords but no actual video, skipping video download');
          continue;
        }

        const currentUrl = page.url();
        const extractedTweetId = extractTweetIdFromUrl(currentUrl);

        if (extractedTweetId) {
          console.log(`🆔 Extracted tweet ID: ${extractedTweetId}`);

          tweetData.tweetId = extractedTweetId;

          // Make sure the links are converted to x.com for this updated tweet data
          tweetData.tweetLink = convertToXDotCom(tweetData.tweetLink);
          tweetData.tweetLinkExtra = convertToXDotCom(tweetData.tweetLinkExtra);

          // Re-insert or update tweet data with the potentially corrected tweetId and updated content
          await insertTweet(tweetData);

          // Get tweet ID for video download (ensure it's the correct ID from the page)
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

              // Download the video and save tweet content, passing the finalTweetContent
              await downloadVideo(videoVariant.url, tweetId, finalTweetContent);
            } else {
              console.log('⚠️ No high-quality video found for this tweet');
            }
          } else {
             console.log('⚠️ Could not reliably extract tweet ID for video download.');
          }
        } else {
          console.log('⚠️ Could not extract tweet ID from URL for video processing');
        }
      } catch (error) {
        console.error('❌ Error processing video/clip tweet:', error);
      }
    }
  }

  await browser.close();
})();