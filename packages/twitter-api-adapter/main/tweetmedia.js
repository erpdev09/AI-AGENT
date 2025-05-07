/* 
Example for docs */

const { postTweetWithImage } = require('../managetweet/mediatweet'); // adjust path as needed

(async () => {
  await postTweetWithImage('Hello world! Here’s a picture with my tweet! via twitter api', './media/tweet_image.png');
})();
