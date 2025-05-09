/*  Replies are madd using the twitter API SDK
This requires user to Input their credentials like
@Yeite Rilsosing Koireng


There root source folder for the adapter is here 
packages/twitter-api-adapter
*/
const { postTweet } = require('../packages/twitter-api-adapter/managetweet/createtweet');

postTweet('this is a message sent.');















// This is a feature to tweet for images

// const { postTweetWithImage } = require('../managetweet/mediatweet'); // adjust path as needed

// (async () => {
//   await postTweetWithImage('Hello world! Here’s a picture with my tweet! via twitter api', './media/tweet_image.png');
// })();
