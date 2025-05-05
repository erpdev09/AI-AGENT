const { syncGiveaways } = require('../../ weaviate/pgvector');
const nlp = require('compromise');
const chrono = require('chrono-node');
const pool = require('../../../config/dbconnect');  // PostgreSQL connection

/**
 * Extracts giveaway details from tweet content
 * @param {string} tweetContent - The content of the tweet to analyze
 * @returns {Object} - Extracted giveaway details
 */
function extractGiveawayDetails(tweetContent) {
  // Check intent: Improved regex to cover more variations
  const isCreateGiveaway = /create a (giveaway|gw|campaign|contest|prize|draw)/i.test(tweetContent);
  
  // Extract number of participants
  let doc = nlp(tweetContent);
  let number = doc.numbers().values().map(n => n.number)[0];
  
  // Fallback: extract number followed by participant-related keywords
  if (!number) {
    const match = tweetContent.match(/(\d+)\s*(people|peep|guys|users|participants|members)?/i);
    if (match) number = parseInt(match[1]);
  }
  
  // Parse deadline with chrono-node
  const deadline = chrono.parseDate(tweetContent);
  
  // Extract amount before "SOL", "Solana", or a contract/address-like string
  let amount;
  const tokenMatch = tweetContent.match(/([\d.]+)\s*(SOL|Solana|[1-9A-HJ-NP-Za-km-z]{32,}|USDC|usdc|bonk|Bonk|wif)/i);
  let tokenType = 'SOL';  // Default to SOL if no match is found
  if (tokenMatch) {
    amount = parseFloat(tokenMatch[1]);
    tokenType = tokenMatch[2]; // Get the token type
  }

  return { isCreateGiveaway, participantCount: number, amount, tokenType, deadline };
}

/**
 * Function to insert giveaway details into the PostgreSQL database
 * @param {Object} giveawayDetails - The details of the giveaway
 */
async function insertGiveawayData(giveawayDetails) {
  const { isCreateGiveaway, participantCount, amount, tokenType, deadline, tweetId, userName } = giveawayDetails;

  const query = `
    INSERT INTO giveaways (is_create_giveaway, participant_count, amount, token_type, deadline, tweet_id, user_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING giveaway_id;
  `;
  
  const values = [
    isCreateGiveaway,
    participantCount,
    amount,
    tokenType,
    deadline,
    tweetId,
    userName
  ];

  try {
    const res = await pool.query(query, values);
    console.log(`Giveaway stored with ID: ${res.rows[0].giveaway_id}`);
  } catch (err) {
    console.error('Error inserting giveaway data:', err);
  }
}

/**
 * Function to perform giveaway tweet search, extract details from each tweet, and store in the database
 */
async function runGiveawaySearch() {
  try {
    const results = await syncGiveaways();
    
    console.log('Giveaway Search Results:');
    if (results.length > 0) {
      // Filter results for valid giveaways
      const validGiveaways = results.filter(result => {
        const giveawayDetails = extractGiveawayDetails(result.content);
        return giveawayDetails.isCreateGiveaway;
      });

      if (validGiveaways.length > 0) {
        validGiveaways.forEach(async (result, index) => {
          console.log(`Result ${index + 1}:`);
          console.log(`  Tweet ID: ${result.tweet_id}`);
          console.log(`  User Name: ${result.user_name}`);
          console.log(`  Content: ${result.content}`);
          
          // Extract giveaway details from tweet content
          const giveawayDetails = extractGiveawayDetails(result.content);
          console.log(`  Giveaway Details:`);
          console.log(`    Valid Giveaway: ${giveawayDetails.isCreateGiveaway}`);
          console.log(`    Participants: ${giveawayDetails.participantCount || 'Unknown'}`);
          console.log(`    Amount: ${giveawayDetails.amount ? `${giveawayDetails.amount} ${giveawayDetails.tokenType}` : 'Unknown'}`);
          console.log(`    Token Type: ${giveawayDetails.tokenType || 'Unknown'}`);
          console.log(`    Deadline: ${giveawayDetails.deadline ? giveawayDetails.deadline.toLocaleString() : 'Not specified'}`);
          
          // Construct the tweet link using the tweet ID
          const tweetLink = `https://x.com/${result.user_name}/status/${result.tweet_id}`;
          console.log(`  Tweet Link: ${tweetLink}`);
          console.log(`  Created At: ${result.created_at}`);

          console.log('-----------------------------');

          // Insert the giveaway details into the database
          await insertGiveawayData({
            isCreateGiveaway: giveawayDetails.isCreateGiveaway,
            participantCount: giveawayDetails.participantCount,
            amount: giveawayDetails.amount,
            tokenType: giveawayDetails.tokenType,
            deadline: giveawayDetails.deadline,
            tweetId: result.tweet_id,
            userName: result.user_name
          });
        });
      } else {
        console.log('No valid giveaway tweets found.');
      }
    } else {
      console.log('No giveaway tweets found.');
    }
  } catch (error) {
    console.error('Error running the giveaway search:', error);
  }
}

/**
 * Process a specific tweet and extract giveaway information from it
 * @param {Object} tweet - Tweet object with content field
 * @returns {Object} - Extracted giveaway details
 */
function processTweet(tweet) {
  return extractGiveawayDetails(tweet.content);
}

// Export the functions for external use
module.exports = {
  runGiveawaySearch,
  extractGiveawayDetails,
  processTweet
};

// Optional: run when called directly
if (require.main === module) {
  runGiveawaySearch();
}
