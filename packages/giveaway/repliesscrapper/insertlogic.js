const getTweetReplies = require('../../twitterapi.io/scrape');
const pool = require('../../../config/dbconnect'); // PostgreSQL pool
const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

const extractSolanaAddresses = (text) => {
  const matches = text.match(solanaAddressRegex);
  return matches || [];
};

const tweetId = '';
const giveawayId = tweetId; // Same as giveaway_id
const apiKey = '';

getTweetReplies(tweetId, apiKey)
  .then(async data => {
    if (data && data.tweets && data.tweets.length > 0) {
      for (const reply of data.tweets) {
        const username = reply.author.userName;
        const tweetText = reply.text;
        const tweetUrl = reply.url;

        const solanaAddresses = extractSolanaAddresses(tweetText);

        if (solanaAddresses.length > 0) {
          const solanaAddress = solanaAddresses[0]; // Assume first match is the address

          try {
            const insertQuery = `
              INSERT INTO participants (giveaway_id, username, solana_address, tweet_url)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (giveaway_id, username) DO NOTHING
            `;
            await pool.query(insertQuery, [
              giveawayId,
              username,
              solanaAddress,
              tweetUrl
            ]);

            console.log(`✅ Inserted: @${username} | ${solanaAddress}`);
          } catch (err) {
            console.error(`❌ DB Insert Error for @${username}:`, err.message);
          }
        } else {
          console.log(`⚠️ No Solana address found for @${username}`);
        }
      }
    } else {
      console.log('No replies found.');
    }
  })
  .catch(err => {
    console.error('Error fetching tweet replies:', err);
  });
