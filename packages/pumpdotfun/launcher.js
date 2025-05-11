// launcher.js
const { deployToken } = require('./index');

(async () => {
  const result = await deployToken({
    tokenName: "Test Launch Token",
    tokenTicker: "TLT",
    description: "Token launched via modular script",
    imageUrl: "https://example.com/token-image.png",
    twitter: "https://twitter.com/yourtoken",
    telegram: "https://t.me/yourtoken",
    website: "https://yourtoken.io",
    initialLiquiditySOL: 0.01,
  });

  if (result.success) {
    console.log("✅ Token Launched!");
    console.log(result);
  } else {
    console.error("❌ Launch Failed:", result.error);
  }
})();
