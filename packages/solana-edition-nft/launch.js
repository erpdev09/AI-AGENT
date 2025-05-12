require("dotenv").config();
const axios = require("axios");
const mintNFT = require("./mintNFT");
const resolveImagePath = require("./resolveImagePath");

(async () => {
  try {
    const response = await axios.get("http://localhost:3000/createnft");

    // ✅ Log full response for debugging
    console.log("🛰️ Full API Response:");
    console.log(response.data);

    const tweets = response.data.data;

    for (const tweet of tweets) {
      const { tweet_id, name, supply } = tweet;

      const imagePath = resolveImagePath(tweet_id);
      const editionSupply = parseInt(supply);

      console.log(`🚀 Launching NFT for Tweet ID ${tweet_id}`);

      const result = await mintNFT({
        imagePath,
        name,
        symbol: name,
        description: "NFT collection",
        editionSupply,
      });

      console.log("🎉 NFT Minted Successfully:");
      console.log(result);
    }
  } catch (err) {
    console.error("❌ Failed to launch NFT:", err.message);
  }
})();
