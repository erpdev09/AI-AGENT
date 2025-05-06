const axios = require('axios');

/**
 * Fetches tweet data and extracts the high-bitrate video variant (2176000).
 * @param {string} apiKey - Your API key.
 * @param {string} tweetId - The tweet ID to fetch.
 * @returns {Promise<object|null>} - The video variant or null if not found.
 */
async function videoDownloader(apiKey, tweetId) {
  try {
    const options = {
      method: 'GET',
      url: 'https://api.twitterapi.io/twitter/tweets',
      params: {
        tweet_ids: tweetId,
      },
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    };

    const response = await axios(options);
    const tweet = response.data?.tweets?.[0];

    const videoVariant = tweet?.extendedEntities?.media?.[0]?.video_info?.variants?.find(
      (variant) => variant.bitrate === 2176000 && variant.content_type === 'video/mp4'
    );

    return videoVariant || null;
  } catch (error) {
    console.error('Fetch error:', error.message);
    return null;
  }
}

module.exports = { videoDownloader };
