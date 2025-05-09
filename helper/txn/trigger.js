// trigger.js
const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function triggerActivityProcessing() {
  console.log(`\n🚀 [${new Date().toISOString()}] Triggering /todoactivity on ${API_BASE_URL}...`);
  try {
    const response = await axios.get(`${API_BASE_URL}/todoactivity`);
    
    console.log('✅ /todoactivity call completed.');
    console.log('API Response Message:', response.data.message);
    console.log('Total items processed for action in this run:', response.data.processed_count);
    
    if (response.data.actions && response.data.actions.length > 0) {
      console.log(`📋 Actions Summary (Count: ${response.data.actions.length}):`);
      response.data.actions.forEach((actionReport, index) => {
        console.log(`--- Action Report ${index + 1} ---`);
        console.log(`  Tweet Link: ${actionReport.tweet_link_extra || actionReport.original?.tweet_link_extra || 'N/A'}`);
        console.log(`  Content Snippet: ${(actionReport.tweet_content || actionReport.original?.content || "N/A").substring(0,70)}...`);
        console.log(`  Status: ${actionReport.status}`);
        
        if (actionReport.status === 'success') {
          if(actionReport.action) console.log(`  Type: ${actionReport.action}`);
          if(actionReport.txid) console.log(`  TXID/Signature: ${actionReport.txid}`);
          if(actionReport.signature) console.log(`  Signature: ${actionReport.signature}`);
          if(actionReport.explorer) console.log(`  Explorer: ${actionReport.explorer}`);
          console.log(`  DB Update: ${actionReport.dbStatus}`);
        } else if (actionReport.error) {
          console.log(`  Error: ${actionReport.error}`);
        } else if (actionReport.reason) {
           console.log(`  Reason Skipped: ${actionReport.reason}`);
        }
        console.log('-------------------------');
      });
    } else {
      console.log("🔵 No specific actions were detailed in this run by the API.");
    }

  } catch (err) {
    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`❌ Error response from /todoactivity: ${err.response.status} ${err.response.statusText}`);
      console.error('Error Data:', err.response.data);
    } else if (err.request) {
      // The request was made but no response was received
      console.error('❌ No response received from /todoactivity. Server might be down or unreachable.');
      console.error('Error Request Details:', err.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('❌ Error setting up request to /todoactivity:', err.message);
    }
  } finally {
    console.log(`🏁 Trigger cycle finished at ${new Date().toISOString()}`);
  }
}

// --- Main Execution ---
const runInterval = parseInt(process.env.TRIGGER_INTERVAL_MS || "60000", 10); // Default to 60 seconds

if (require.main === module) {
    triggerActivityProcessing(); // Run once immediately

    if (runInterval > 0) {
        console.log(`🔁 Will trigger again in ${runInterval / 1000} seconds...`);
        setInterval(triggerActivityProcessing, runInterval);
    } else {
        console.log("ℹ️ Trigger will only run once as interval is set to 0 or invalid.");
    }
}

module.exports = triggerActivityProcessing; // Export if you want to call it from elsewhere