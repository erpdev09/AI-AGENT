const pool = require('../config/dbconnect'); // adjust path if needed

async function shouldPerformAction(tweet_link_extra) {
  if (!tweet_link_extra) throw new Error('Missing tweet_link_extra');

  const query = `
    SELECT action_perform
    FROM tweets1
    WHERE tweet_link_extra = $1
    LIMIT 1
  `;
  const values = [tweet_link_extra];
  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    throw new Error('No tweet found');
  }

  const actionStatus = result.rows[0].action_perform;
  return actionStatus !== true;
}

module.exports = shouldPerformAction;