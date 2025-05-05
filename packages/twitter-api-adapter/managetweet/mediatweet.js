const { TwitterApi } = require('twitter-api-v2');
const path = require('path');

// Create a Twitter client instance
const client = new TwitterApi({
  appKey: '',
  appSecret: '',
  accessToken: '',
  accessSecret: '',
});

/**
 * Posts a tweet with an image.
 * @param {string} tweetText - The text of the tweet.
 * @param {string} imagePath - The relative or absolute path to the image file.
 * @returns {Promise<object>} - The tweet response from Twitter API.
 */
async function postTweetWithImage(tweetText, imagePath) {
  try {
    const absolutePath = path.resolve(imagePath);
    const mediaId = await client.v1.uploadMedia(absolutePath, { type: 'image/png' }); // adjust type if needed

    const tweet = await client.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });
    console.log(`Tweet posted with ID ${tweet.data.id}`);
    return tweet;
  } catch (error) {
    console.error(`Failed to post tweet: ${error}`);
    throw error;
  }
}

// Export the function
module.exports = { postTweetWithImage };
