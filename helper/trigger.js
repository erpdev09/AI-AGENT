const axios = require('axios');
const shouldPerformAction = require('./updateAction'); // import shouldPerformAction

async function triggerSwaps() {
  try {
    // Fetch activity data from your API
    const { data } = await axios.get('http://localhost:3000/todoactivity');
    const results = data.results;

    // Check if results is an array
    if (!Array.isArray(results)) {
      console.error('❌ Invalid results format');
      return;
    }

    // Loop through each item in the results
    for (const item of results) {
      const contracts = item.contracts || [];
      const tokenAmounts = item.tokenAmounts || [];
      const tweetLink = item.tweet_link_extra;

      // Check if the action should be performed based on the tweet_link_extra
      const canPerformAction = await shouldPerformAction(tweetLink);
      if (!canPerformAction) {
        console.log(`⏭️ Skipping ${tweetLink} - action already performed`);
        continue; // Skip if the action has already been performed
      }

      // Loop through the contracts and trigger swaps
      for (let i = 0; i < contracts.length; i++) {
        const contract = contracts[i];
        const amount = tokenAmounts[i] || 0;

        const url = `http://localhost:3000/swaptoken/${contract}/${amount}`;
        console.log(`⏳ Triggering swap for ${contract} with amount ${amount}`);

        try {
          // Make the swap API call
          const response = await axios.get(url);
          console.log(`✅ Swap successful for ${contract} with amount ${amount}`);
          console.log(response.data);
        } catch (swapErr) {
          // Handle errors during the swap
          console.error(`❌ Swap failed for ${contract} with amount ${amount}:`, swapErr.response?.data || swapErr.message);
        }
      }
    }

    console.log('🚀 All swaps processed!');
  } catch (err) {
    // Handle errors during data fetch
    console.error('❌ Error fetching /todoactivity data:', err.message);
  }
}

// Run the function
triggerSwaps();
