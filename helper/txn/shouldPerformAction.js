// shouldPerformAction.js
const pool = require('../../config/dbconnect'); // Adjust path if needed

/**
 * Check if an action should be performed for a given tweet.
 * NOTE: The core logic for skipping already performed actions is now primarily
 * handled within the `/todoactivity` route in `api.js` by querying the DB
 * before processing tweets. This function can be used for standalone checks if needed.
 *
 * @param {string} tweet_link_extra - The tweet link to check.
 * @returns {Promise<boolean>} - True if action should be performed (not yet performed), false otherwise.
 * @throws {Error} if tweet_link_extra is missing or if DB query fails.
 */
async function shouldPerformAction(tweet_link_extra) {
  if (!tweet_link_extra) {
    console.error('❌ shouldPerformAction: Missing tweet_link_extra.');
    throw new Error('Missing tweet_link_extra');
  }

  try {
    const query = `
      SELECT action_perform 
      FROM tweets1 
      WHERE tweet_link_extra = $1 
      LIMIT 1;
    `;
    const values = [tweet_link_extra];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      // No record of this tweet, so action should be performed.
      console.log(`✅ Action can be performed for new tweet: ${tweet_link_extra} (no existing record).`);
      return true;
    }

    const actionStatus = result.rows[0].action_perform; // This will be TRUE, FALSE, or NULL
    const shouldPerform = actionStatus !== true; // Perform if FALSE or NULL
    
    if (shouldPerform) {
      console.log(`✅ Action can be performed for tweet: ${tweet_link_extra} (status is FALSE or NULL).`);
    } else {
      console.log(`⏭️ Action ALREADY performed or marked TRUE for tweet: ${tweet_link_extra}. Skipping.`);
    }
    
    return shouldPerform;
  } catch (error) {
    console.error(`❌ Error checking action status for ${tweet_link_extra}: ${error.message}`);
    throw error; // Re-throw the error to be handled by the caller
  }
}

module.exports = shouldPerformAction;