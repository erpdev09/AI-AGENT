// updateTweetActionStatus.js
const pool = require('../../config/dbconnect'); // Adjust path if needed

/**
 * Update the action_perform status of a tweet after a successful action.
 * @param {string} tweet_link_extra - The tweet link to update.
 * @returns {Promise<boolean>} - Whether the update was successful.
 */
async function updateTweetActionStatus(tweet_link_extra) {
  if (!tweet_link_extra) {
    console.error('❌ updateTweetActionStatus: Missing tweet_link_extra for status update.');
    return false; // Or throw new Error('Missing tweet_link_extra');
  }

  try {
    const updateQuery = `
      UPDATE tweets1 
      SET action_perform = TRUE 
      WHERE tweet_link_extra = $1
      RETURNING tweet_link_extra; 
    `; // RETURNING can be useful for confirmation
    
    const result = await pool.query(updateQuery, [tweet_link_extra]);
    
    if (result.rowCount > 0) {
      console.log(`✅ Successfully updated action_perform=TRUE for tweet: ${tweet_link_extra}`);
      return true;
    } else {
      // This could happen if the tweet_link_extra somehow wasn't in the DB,
      // or if it was already TRUE and the WHERE clause didn't match (if you added 'AND action_perform = FALSE').
      console.warn(`⚠️ No tweet found with link to update action_perform: ${tweet_link_extra}. Or status was already TRUE.`);
      return false; // Or true if "already true" is considered a success for this function's purpose.
    }
  } catch (error) {
    console.error(`❌ Error updating tweet action status for ${tweet_link_extra}: ${error.message}`);
    // throw error; // Optionally re-throw if the caller should handle it
    return false;
  }
}

/**
 * (This function seems less relevant if updates are immediate within executeAction)
 * Process action response from todoactivity and update database for successful actions.
 * Kept for potential other uses, but the main flow updates status directly.
 * @param {Object} actionResponse - The response from todoactivity endpoint.
 * @returns {Promise<void>}
 */
async function processActionsResponse(actionResponse) {
  if (!actionResponse || !actionResponse.actions || !Array.isArray(actionResponse.actions)) {
    console.warn('⚠️ processActionsResponse: Invalid action response format.');
    return;
  }
  
  try {
    for (const action of actionResponse.actions) {
      if (action.status === 'success' && action.result && action.result.dbStatus !== "updated" && action.original && action.original.tweet_link_extra) {
        // This condition tries to avoid re-updating if dbStatus is already "updated"
        // However, the primary update should happen in executeAction.
        console.log(`ℹ️ processActionsResponse attempting update for ${action.original.tweet_link_extra} (if not already done).`);
        await updateTweetActionStatus(action.original.tweet_link_extra);
      }
    }
    console.log('✅ processActionsResponse: Finished processing actions for DB updates.');
  } catch (error) {
    console.error(`❌ Error in processActionsResponse: ${error.message}`);
  }
}

module.exports = {
  updateTweetActionStatus,
  processActionsResponse // Exporting in case it's used elsewhere
};