const axios = require('axios');
const updateAction = require('./updateAction'); // adjust path as needed

async function triggerSwaps() {
  try {
    const { data } = await axios.get('http://localhost:3000/todoactivity');
    const results = data.results;

    if (!Array.isArray(results)) {
      console.error('❌ Invalid results format');
      return;
    }

    for (const item of results) {
      const contracts = item.contracts || [];
      const tokenAmounts = item.tokenAmounts || [];
      const tweetLink = item.tweet_link_extra;

      if (item.action_perform === true) {
        console.log(`⏭️ Skipping ${tweetLink} - already marked performed`);
        continue;
      }

      for (let i = 0; i < contracts.length; i++) {
        const contract = contracts[i];
        const amount = tokenAmounts[i] || 0;

        const url = `http://localhost:3000/swaptoken/${contract}/${amount}`;
        console.log(`⏳ Triggering swap for ${contract} with amount ${amount}`);

        try {
          const response = await axios.get(url);
          console.log(`✅ Swap successful for ${contract} with amount ${amount}`);
          console.log(response.data);

          // Call internal DB function directly
          try {
            const result = await updateAction(tweetLink, true);
            console.log(result);
          } catch (updateErr) {
            console.error(`⚠️ DB update failed for ${tweetLink}:`, updateErr.message);
          }

        } catch (swapErr) {
          console.error(`❌ Swap failed for ${contract} with amount ${amount}:`, swapErr.response?.data || swapErr.message);
        }
      }
    }

    console.log('🚀 All swaps processed!');
  } catch (err) {
    console.error('❌ Error fetching /todoactivity data:', err.message);
  }
}

// Run it
triggerSwaps();
