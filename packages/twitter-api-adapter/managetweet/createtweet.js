const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: '',
  appSecret: '',
  accessToken: '',
  accessSecret: '',
});

/**
 * Posts a tweet with the given text.
 * @param {string} tweetText - The content of the tweet to post.
 */
async function postTweet(tweetText) {
  try {
    const tweet = await client.v2.tweet(tweetText);
    console.log(`Tweet posted with ID ${tweet.data.id}`);
  } catch (error) {
    console.error(`Failed to post tweet: ${error}`);
  }
}

module.exports = {
  postTweet,
};
