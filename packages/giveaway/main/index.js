const { syncGiveaways } = require('../../ weaviate/pgvector');
const nlp = require('compromise');
const chrono = require('chrono-node');
const pool = require('../../../config/dbconnect');

function extractGiveawayDetails(tweetContent) {
  const isCreateGiveaway = /create a (giveaway|gw|campaign|contest|prize|draw)/i.test(tweetContent);
  let participantCount;

  const participantKeywords = '(people|peep|guy|guys|user|users|participant|participants|member|members|winner|winners)';
  const participantMatch = tweetContent.match(
    new RegExp(`(?:for|draw|select|choose|pick)\\s*(\\d+)\\s*${participantKeywords}`, 'i')
  );

  if (participantMatch && participantMatch[1]) {
    participantCount = parseInt(participantMatch[1]);
  } else {
    let doc = nlp(tweetContent);
    const numbersFromNlp = doc.numbers().values().map(n => n.number);

    const amountTokenRegex = /([\d.]+)\s*(SOL|Solana|[1-9A-HJ-NP-Za-km-z]{32,}|USDC|usdc|bonk|Bonk|wif)/i;
    const amountMatchFromTweet = tweetContent.match(amountTokenRegex);
    const extractedAmountStr = amountMatchFromTweet ? amountMatchFromTweet[1] : null;

    const generalParticipantKeywords = '(people|peep|guy|guys|user|users|participant|participants|member|members)';
    const generalParticipantContextMatch = tweetContent.match(
        new RegExp(`(\\d+)\\s*${generalParticipantKeywords}`, 'i')
    );

    if (generalParticipantContextMatch && generalParticipantContextMatch[1]) {
        const potentialCount = parseInt(generalParticipantContextMatch[1]);
        if (generalParticipantContextMatch[1] !== extractedAmountStr) {
             participantCount = potentialCount;
        }
    }

    if (!participantCount && numbersFromNlp.length > 0) {
        for (const num of numbersFromNlp) {
            if (String(num) !== extractedAmountStr) {
                const checkContextRegex = new RegExp(`${num}\\s*${generalParticipantKeywords}`, 'i');
                if (checkContextRegex.test(tweetContent)) {
                    participantCount = num;
                    break;
                }
                if (!participantCount) {
                    participantCount = num;
                    break;
                }
            }
        }
    }

    if (!participantCount) {
      const fallbackMatch = tweetContent.match( new RegExp(`(\\d+)\\s*${generalParticipantKeywords}`, 'i'));
      if (fallbackMatch && fallbackMatch[1]) {
          if (fallbackMatch[1] !== extractedAmountStr) {
            participantCount = parseInt(fallbackMatch[1]);
          } else if (!extractedAmountStr && fallbackMatch[1]) {
            participantCount = parseInt(fallbackMatch[1]);
          }
      }
    }
  }

  const deadline = chrono.parseDate(tweetContent);
  let amount;
  const tokenMatch = tweetContent.match(/([\d.]+)\s*(SOL|Solana|[1-9A-HJ-NP-Za-km-z]{32,}|USDC|usdc|bonk|Bonk|wif)/i);
  let tokenType = 'SOL';
  if (tokenMatch) {
    amount = parseFloat(tokenMatch[1]);
    tokenType = tokenMatch[2].toUpperCase();
    if (tokenType === 'SOLANA') {
      tokenType = 'SOL';
    }
  }

  return { isCreateGiveaway, participantCount, amount, tokenType, deadline };
}

/**
 * Inserts giveaway data into PostgreSQL, using actualTweetId as the giveaway_id (Primary Key).
 * ASSUMES 'giveaway_id' in the DB is BIGINT PRIMARY KEY and not BIGSERIAL.
 * ASSUMES the separate 'tweet_id' column has been removed from the DB table.
 * @param {Object} giveawayDetails - Extracted details { isCreateGiveaway, participantCount, amount, tokenType, deadline }
 * @param {string | number} actualTweetId - The ID from the tweet data (e.g., result.tweet_id), to be used as giveaway_id.
 */
async function insertGiveawayData(giveawayDetails, actualTweetId) {
  const { isCreateGiveaway, participantCount, amount, tokenType, deadline } = giveawayDetails;

  // 'giveaway_id' is now the first column and will take 'actualTweetId'.
  // 'created_at', 'updated_at', 'action_performed' have defaults in the DB.
  const query = `
    INSERT INTO giveaway (
        giveaway_id,      -- This will be the actualTweetId
        is_create_giveaway,
        participant_count,
        amount,
        token_type,
        deadline
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (giveaway_id) DO NOTHING -- giveaway_id is the PK and stores the tweet_id
    RETURNING giveaway_id;              -- This will return the actualTweetId if inserted
  `;

  const values = [
    actualTweetId,    // Value for giveaway_id (which is the tweet_id)
    isCreateGiveaway,
    participantCount,
    amount,
    tokenType,
    deadline
  ];

  try {
    const res = await pool.query(query, values);
    if (res.rows.length > 0) {
      // The returned giveaway_id will be the actualTweetId
      console.log(`✅ Giveaway stored. Giveaway ID (Tweet ID): ${res.rows[0].giveaway_id}`);
      return res.rows[0].giveaway_id;
    } else {
      // This block is hit if ON CONFLICT (giveaway_id) DO NOTHING was triggered
      console.log(`ℹ️ Giveaway with ID (Tweet ID) ${actualTweetId} already exists.`);
      return actualTweetId; // Return the existing ID
    }
  } catch (err) {
    console.error(`❌ Error inserting giveaway data for ID (Tweet ID) ${actualTweetId}:`, err);
    // If ON CONFLICT is not working as expected or another error occurs
    if (err.code === '23505') { // unique_violation (should be caught by ON CONFLICT)
        console.warn(`⚠️ Unique constraint violation for Giveaway ID (Tweet ID) ${actualTweetId}. This should have been handled by ON CONFLICT.`);
        return actualTweetId; // Indicate it exists
    }
    throw err;
  }
}

async function runGiveawaySearch() {
  try {
    const results = await syncGiveaways();

    console.log('🔍 Giveaway Search Results:');
    if (results && results.length > 0) {
      const validGiveaways = results.filter(result => {
        if (!result || !result.content || !result.tweet_id) {
            console.warn('⚠️ Skipping a result due to missing content or tweet_id:', result);
            return false;
        }
        const giveawayDetails = extractGiveawayDetails(result.content);
        return giveawayDetails.isCreateGiveaway;
      });

      if (validGiveaways.length > 0) {
        for (let index = 0; index < validGiveaways.length; index++) {
          const result = validGiveaways[index];
          console.log(`\nProcessing Tweet ${index + 1}:`);
          // result.tweet_id is the value that will become the 'giveaway_id' in the table.
          console.log(`  Tweet ID (to be used as Giveaway ID): ${result.tweet_id}`);
          console.log(`  User Name: ${result.user_name}`);
          console.log(`  Content: ${result.content}`);

          const giveawayDetails = extractGiveawayDetails(result.content);
          console.log(`  Extracted Giveaway Details:`);
          console.log(`    Is Giveaway: ${giveawayDetails.isCreateGiveaway}`);
          console.log(`    Participants: ${giveawayDetails.participantCount !== undefined ? giveawayDetails.participantCount : 'Unknown'}`);
          console.log(`    Amount: ${giveawayDetails.amount !== undefined ? `${giveawayDetails.amount} ${giveawayDetails.tokenType}` : 'Unknown'}`);
          console.log(`    Token Type: ${giveawayDetails.tokenType || 'Default (SOL) or Unknown'}`);
          console.log(`    Deadline: ${giveawayDetails.deadline ? giveawayDetails.deadline.toLocaleString() : 'Not specified'}`);

          const tweetLink = `https://x.com/${result.user_name}/status/${result.tweet_id}`;
          console.log(`  Tweet Link: ${tweetLink}`);
          console.log(`  Tweet Created At: ${result.created_at}`);
          console.log('-----------------------------');

          // The 'result.tweet_id' is passed as 'actualTweetId'
          // and will be inserted into the 'giveaway_id' column (which is PK)
          await insertGiveawayData(giveawayDetails, result.tweet_id);
        }
        console.log('\n✅ All valid giveaways processed.');
      } else {
        console.log('⚠️ No valid giveaway tweets found in the fetched results.');
      }
    } else {
      console.log('📭 No tweets found by syncGiveaways or an issue occurred during fetching.');
    }
  } catch (error) {
    console.error('❌ Error running the giveaway search process:', error);
  }
}

function processTweet(tweet) {
  const details = extractGiveawayDetails(tweet.content);
  return {
      ...details,
      tweet_id: tweet.tweet_id
  };
}

module.exports = {
  runGiveawaySearch,
  extractGiveawayDetails,
  processTweet,
  insertGiveawayData
};

if (require.main === module) {
  runGiveawaySearch().then(() => {
        console.log("Giveaway search script finished.");
        pool.end().then(() => console.log("Database pool closed."));
    }).catch(err => {
        console.error("Critical error in script execution:", err);
        pool.end().then(() => console.log("Database pool closed after error."));
        process.exit(1);
    });
}