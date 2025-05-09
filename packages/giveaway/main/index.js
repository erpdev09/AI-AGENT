const { syncGiveaways } = require('../../ weaviate/pgvector');
const nlp = require('compromise');
const chrono = require('chrono-node');
const pool = require('../../../config/dbconnect');

function extractGiveawayDetails(tweetContent) {
  const isCreateGiveaway = /create a (giveaway|gw|campaign|contest|prize|draw)/i.test(tweetContent);
  let participantCount;

  // Updated primary regex to include singular forms like 'user', 'member', 'winner', 'participant', 'guy'
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

    // Updated fallback regex keywords
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
                // Check if this number is immediately followed by a (singular/plural) participant keyword
                // This helps if the number is not caught by the more specific regexes above but is contextually a participant count
                const checkContextRegex = new RegExp(`${num}\\s*${generalParticipantKeywords}`, 'i');
                if (checkContextRegex.test(tweetContent)) {
                    participantCount = num;
                    break;
                }
                // If no direct keyword context, but it's a number not the amount,
                // and not already assigned, this is a more general fallback.
                if (!participantCount) { // Check if participantCount is still not set
                    participantCount = num; // Assign it, but it might be overwritten if a better context is found later in the loop
                                        // or prefer the one with keyword context.
                    // We break here assuming the first non-amount number is the participant count if no other context is found.
                    // This can be risky if there are other numbers (e.g. "giveaway for 2 users, id 7, prize 0.1 sol")
                    // The regexes above are better. This loop is a last resort.
                    break;
                }
            }
        }
        //This specific condition after loop was a bit problematic, simplified above
        // if (participantCount && String(participantCount) === extractedAmountStr && !generalParticipantContextMatch) {
        //      participantCount = undefined; // Reset if it was mistakenly set to the amount without context
        // }
    }

    // Final fallback regex, also updated
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

// --- The rest of your script (insertGiveawayData, runGiveawaySearch, etc.) remains the same ---
// Make sure to include them if you're replacing the whole file. For brevity, I'm only showing the changed function.

/**
 * Inserts giveaway data into PostgreSQL
 * @param {Object} giveawayDetails
 */
async function insertGiveawayData(giveawayDetails) {
  const { isCreateGiveaway, participantCount, amount, tokenType, deadline, tweetId } = giveawayDetails;

  const query = `
    INSERT INTO giveaway (is_create_giveaway, participant_count, amount, token_type, deadline, tweet_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING giveaway_id;
  `;

  const values = [
    isCreateGiveaway,
    participantCount,
    amount,
    tokenType,
    deadline,
    tweetId
  ];

  try {
    const res = await pool.query(query, values);
    console.log(`✅ Giveaway stored with ID: ${res.rows[0].giveaway_id}`);
    return res.rows[0].giveaway_id;
  } catch (err) {
    console.error('❌ Error inserting giveaway data:', err);
    throw err;
  }
}

/**
 * Main function to search tweets, extract giveaway info, and store them
 */
async function runGiveawaySearch() {
  try {
    const results = await syncGiveaways();

    console.log('🔍 Giveaway Search Results:');
    if (results && results.length > 0) {
      const validGiveaways = results.filter(result => {
        if (!result || !result.content) return false;
        const giveawayDetails = extractGiveawayDetails(result.content);
        return giveawayDetails.isCreateGiveaway;
      });

      if (validGiveaways.length > 0) {
        for (let index = 0; index < validGiveaways.length; index++) {
          const result = validGiveaways[index];
          console.log(`Result ${index + 1}:`);
          console.log(`  Tweet ID: ${result.tweet_id}`);
          console.log(`  User Name: ${result.user_name}`);
          console.log(`  Content: ${result.content}`);

          const giveawayDetails = extractGiveawayDetails(result.content);
          console.log(`  Giveaway Details:`);
          console.log(`    Valid Giveaway: ${giveawayDetails.isCreateGiveaway}`);
          console.log(`    Participants: ${giveawayDetails.participantCount !== undefined ? giveawayDetails.participantCount : 'Unknown'}`); // Check for undefined explicitly
          console.log(`    Amount: ${giveawayDetails.amount !== undefined ? `${giveawayDetails.amount} ${giveawayDetails.tokenType}` : 'Unknown'}`);
          console.log(`    Token Type: ${giveawayDetails.tokenType || 'Unknown'}`);
          console.log(`    Deadline: ${giveawayDetails.deadline ? giveawayDetails.deadline.toLocaleString() : 'Not specified'}`);

          const tweetLink = `https://x.com/${result.user_name}/status/${result.tweet_id}`;
          console.log(`  Tweet Link: ${tweetLink}`);
          console.log(`  Created At: ${result.created_at}`);
          console.log('-----------------------------');

          await insertGiveawayData({
            isCreateGiveaway: giveawayDetails.isCreateGiveaway,
            participantCount: giveawayDetails.participantCount,
            amount: giveawayDetails.amount,
            tokenType: giveawayDetails.tokenType,
            deadline: giveawayDetails.deadline,
            tweetId: result.tweet_id
          });
        }
      } else {
        console.log('⚠️ No valid giveaway tweets found.');
      }
    } else {
      console.log('📭 No giveaway tweets found or an issue with fetching results.');
    }
  } catch (error) {
    console.error('❌ Error running the giveaway search:', error);
  }
}

/**
 * Processes a single tweet and extracts giveaway details
 * @param {Object} tweet - Tweet object with `content` field
 * @returns {Object}
 */
function processTweet(tweet) {
  return extractGiveawayDetails(tweet.content);
}

// Export for use in other modules
module.exports = {
  runGiveawaySearch,
  extractGiveawayDetails,
  processTweet
};

// Run script directly if not imported
if (require.main === module) {
  runGiveawaySearch();
}