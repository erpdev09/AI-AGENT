const axios = require('axios');

async function getTweetReplies(tweetId, apiKey) {
  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.twitterapi.io/twitter/tweet/replies?tweetId=${tweetId}`,
      headers: {
        'X-API-Key': apiKey
      }
    });

    console.log('Tweet replies retrieved successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error fetching tweet replies:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

module.exports = getTweetReplies;
