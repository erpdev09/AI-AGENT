const { deployToken } = require('./index');
const axios = require('axios');
const pool = require('../../config/dbconnect');

(async () => {
  try {
    // Step 1: Fetch token details from your local API
    const response = await axios.get('http://localhost:3000/todoactivity/createtoken');
    const data = response.data;
    
    console.log("API Response:");
    console.log(JSON.stringify(data, null, 2));
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No token data received from the API.");
    }
    
    const token = data[0]; // Process the first token entry
    console.log("Token to deploy:");
    console.log(token);
    
    // Step 2: Deploy token using exact API values
    // Make sure property names match what deployToken expects
    const deployResult = await deployToken({
      tokenName: token.name,
      tokenTicker: token.name.substring(0, 4).toUpperCase(), // Generate ticker from name if not provided
      description: token.description,
      imageUrl: token.imageurl, // This URL is passed to deployToken
      website: token.website,
      telegram: token.telegram,
      initialLiquiditySOL: parseFloat(token.initial_liquidity || "0.01")
    });
    
    console.log("Deployment result:");
    console.log(deployResult);
    
    // Step 3: Handle success/failure
    if (deployResult.success) {
      console.log("✅ Token Launched!");
      
      // Step 4: Update database for this tweet
      const tweetId = token.tweetid;
      await pool.query(
        'UPDATE tweets1 SET action_perform = TRUE WHERE tweet_id = $1',
        [tweetId]
      );
      
      console.log(`✅ Database updated for tweet_id: ${tweetId}`);
    } else {
      console.error("❌ Launch Failed:", deployResult.error);
    }
  } catch (err) {
    console.error("❌ Error occurred:", err.message);
  }
})();