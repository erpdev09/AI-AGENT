const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  appKey: '',
  appSecret: '',
  accessToken: '',
  accessSecret: '',
});

async function postTweet(tweetText) {
  try {
    const tweet = await client.v2.tweet(tweetText);
    console.log(`Tweet posted with ID ${tweet.data.id}`);
  } catch (error) {
    console.error(`Failed to post tweet: ${error}`);
  }
}

postTweet('Hello world! This is my first tweet with the Twitter API v2.');