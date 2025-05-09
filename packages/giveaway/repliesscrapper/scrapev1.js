const getTweetReplies = require('../../twitterapi.io/scrape');

// Regex for detecting Solana address (base58, typically 44 characters)
const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;


const extractSolanaAddresses = (text) => {
  const matches = text.match(solanaAddressRegex);
  return matches || [];
};
// if criteria are not met then it wont return anything

const tweetId = '1920760298958364787';
const apiKey = '';

getTweetReplies(tweetId, apiKey)
  .then(data => {
    // Check if the response contains tweets
    if (data && data.tweets && data.tweets.length > 0) {
      // Loop through each tweet reply
      data.tweets.forEach(reply => {
        const author = reply.author.name;
        const username = reply.author.userName;
        const tweetText = reply.text;
        const tweetUrl = reply.url;
        const tweetDate = reply.createdAt;
        
        // Extract potential Solana addresses
        const solanaAddresses = extractSolanaAddresses(tweetText);
        
        // Log the tweet details
        console.log(`Tweet by ${author} (@${username})`);
        console.log(`Tweet Text: ${tweetText}`);
        console.log(`Tweet URL: ${tweetUrl}`);
        console.log(`Created At: ${tweetDate}`);
        
        if (solanaAddresses.length > 0) {
          console.log(`Solana Address(es) found: ${solanaAddresses.join(', ')}`);
        } else {
          console.log('No Solana address found');
        }
        console.log('--------------------------');
      });
    } else {
      console.log('No replies found.');
    }
  })
  .catch(err => {
    console.error('Error fetching tweet replies:', err);
  });