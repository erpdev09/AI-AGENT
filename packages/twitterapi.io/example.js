const axios = require('axios');

// Define your variables
const apiKey = '';
const tweetId = '1919731711459340760';

const options = {
  method: 'GET',
  url: 'https://api.twitterapi.io/twitter/tweets',
  params: {
    tweet_ids: tweetId
  },
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  }
};

axios(options)
  .then(response => {
    const data = response.data;
    const tweet = data.tweets[0];

    const expandedTweet = {
      ...tweet,
      author: tweet.author,
      extendedEntities: tweet.extendedEntities,
    };

    const fullOutput = {
      ...data,
      tweets: [expandedTweet]
    };

    console.log(JSON.stringify(fullOutput, null, 2));
  })
  .catch(error => {
    console.error('Fetch error:', error.message);
  });
