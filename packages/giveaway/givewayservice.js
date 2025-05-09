// giveawayService.js - Complete service integrating with database
const { extractGiveawayDetails } = require('./giveawayExtractor');
const pool = require('../config/dbconnect'); // Update this path to your actual DB connection

/**
 * Inserts giveaway data into PostgreSQL
 * @param {Object} giveawayDetails
 * @returns {Promise<number>} giveaway_id
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
 * Processes tweets and saves valid giveaways to the database
 * @param {Array} tweets - Array of tweet objects with content, tweet_id, and user_name
 * @returns {Promise<Array>} - Array of processed giveaway IDs
 */
async function processAndSaveTweets(tweets) {
  const results = [];
  
  for (const tweet of tweets) {
    const giveawayDetails = extractGiveawayDetails(tweet.content);
    
    if (giveawayDetails.isCreateGiveaway) {
      try {
        const giveawayId = await insertGiveawayData({
          ...giveawayDetails,
          tweetId: tweet.tweet_id
        });
        
        results.push({
          tweet_id: tweet.tweet_id,
          user_name: tweet.user_name,
          giveaway_id: giveawayId,
          details: giveawayDetails
        });
      } catch (error) {
        console.error(`Failed to process tweet ${tweet.tweet_id}:`, error);
      }
    }
  }
  
  return results;
}

/**
 * Retrieves stored giveaways from database
 * @param {Object} filters - Optional filters like token_type, min_amount, etc.
 * @returns {Promise<Array>} - Array of giveaway records
 */
async function getGiveaways(filters = {}) {
  try {
    let query = `
      SELECT g.*, t.user_name, t.content
      FROM giveaway g
      JOIN tweet t ON g.tweet_id = t.tweet_id
      WHERE g.is_create_giveaway = true
    `;
    
    const values = [];
    const conditions = [];
    
    // Add dynamic filters
    if (filters.tokenType) {
      values.push(filters.tokenType);
      conditions.push(`g.token_type = $${values.length}`);
    }
    
    if (filters.minAmount) {
      values.push(filters.minAmount);
      conditions.push(`g.amount >= $${values.length}`);
    }
    
    if (filters.minParticipants) {
      values.push(filters.minParticipants);
      conditions.push(`g.participant_count >= $${values.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY g.deadline ASC';
    
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving giveaways:', error);
    throw error;
  }
}

module.exports = {
  insertGiveawayData,
  processAndSaveTweets,
  getGiveaways
};