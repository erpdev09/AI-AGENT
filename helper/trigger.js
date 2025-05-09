const http = require('http');
const dbconnect = require('../config/dbconnect');

// Function to update action_perform status
async function updateTweetActionStatus(tweetId) {
  try {
    const pool = dbconnect;
    const updateQuery = 'UPDATE tweets1 SET action_perform = true WHERE tweet_id = $1';
    const result = await pool.query(updateQuery, [tweetId]);

    if (result.rowCount > 0) {
      console.log(`✅ Updated action_perform for tweet ID: ${tweetId}`);
      return true;
    } else {
      console.log(`⚠️ No tweet found with ID: ${tweetId}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating tweet status:', error);
    return false;
  }
}

// Function to fetch /todoactivity and update DB
function fetchAndUpdate() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/todoactivity',
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', chunk => data += chunk);

    res.on('end', async () => {
      try {
        const responseData = JSON.parse(data);

        if (
          responseData.actions &&
          responseData.actions.length > 0 &&
          responseData.actions[0].status === 'success'
        ) {
          const tweetUrl = responseData.actions[0].original.tweet_link_extra;
          const tweetId = tweetUrl.split('/status/')[1];

          const updated = await updateTweetActionStatus(tweetId);
          console.log(`DB Update Status: ${updated ? 'success' : 'failed'}`);
        } else {
          console.log('No successful actions found.');
        }
      } catch (err) {
        console.error('❌ Error parsing or processing response:', err);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error);
  });

  req.end();
}

// Run the function
fetchAndUpdate();
