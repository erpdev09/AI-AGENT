const fs = require("fs");
const path = require("path");

function resolveImagePath(tweetId) {
  // Update base directory to reflect the correct path
  const baseDir = path.join(__dirname, "../../twitter-scrapper/custom-scrapper/tweet_images", tweetId);
  
  console.log(`Looking for folder at: ${baseDir}`);  // Debug log

  if (!fs.existsSync(baseDir)) {
    throw new Error(`❌ Folder not found for tweet ID ${tweetId} at ${baseDir}`);
  }

  const possibleExtensions = [".jpg", ".png"];
  for (const ext of possibleExtensions) {
    const imagePath = path.join(baseDir, `${tweetId}${ext}`);
    console.log(`Checking path: ${imagePath}`);  // Debug log
    if (fs.existsSync(imagePath)) {
      console.log(`Image found: ${imagePath}`);
      return imagePath;
    }
  }

  throw new Error(`❌ Image not found for tweet ID ${tweetId} in folder ${baseDir}`);
}

module.exports = resolveImagePath;
