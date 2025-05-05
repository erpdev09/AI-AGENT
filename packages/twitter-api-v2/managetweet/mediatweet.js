const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
  
    appKey: '',
    appSecret: '',
    accessToken: '',
    accessSecret: '',
});

async function postTweetWithImage(tweetText, imagePath) {
  try {
    // Upload the image first
    const mediaId = await client.v1.uploadMedia(imagePath, { type: 'image/png' }); // or 'image/jpeg' depending on the image type
    
    // Post the tweet with the image
    const tweet = await client.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });
    console.log(`Tweet posted with ID ${tweet.data.id}`);
  } catch (error) {
    console.error(`Failed to post tweet: ${error}`);
  }
}

postTweetWithImage('Hello world! Here’s a picture with my tweet! via twitter api', 'tweet.png');
