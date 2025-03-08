const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Initialize Google Generative AI with Gemini API key
const genAI = new GoogleGenerativeAI("");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const loadTweets = () => {
  try {
    const filePath = path.join(__dirname, "../twitter-scrapper/temp", "scraped_tweets.json");
    if (!fs.existsSync(filePath)) {
      console.error("Error: scraped_tweets.json not found at", filePath);
      return [];
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading scraped_tweets.json:", error);
    return [];
  }
};

const saveToBeReplied = (toBeReplied) => {
  const tempFolderPath = path.join(__dirname, "../twitter-scrapper/temp");
  if (!fs.existsSync(tempFolderPath)) {
    fs.mkdirSync(tempFolderPath, { recursive: true });
  }
  const filePath = path.join(tempFolderPath, "tobereplied.json");
  fs.writeFileSync(filePath, JSON.stringify(toBeReplied, null, 2));
  console.log(`Tweets to be replied saved to ${filePath}`);
};

const analyzeTweet = async (tweet) => {
  if (!tweet.originalTweet || !tweet.originalTweet.text) {
    console.warn("Skipping tweet: Invalid data format");
    return null;
  }

  const originalText = tweet.originalTweet.text;
  const firstReply = tweet.replies.length > 0 ? tweet.replies[0].text : "No replies yet.";

  console.log("\n🔹 Evaluating Tweet Thread...");
  console.log("Original Tweet:", originalText);
  console.log("First Reply:", firstReply);

  // Prompt for context evaluation
  const contextPrompt = `You are an Evaluator of Tweets on Twitter. You can determine the context of tweets. Now evaluate this: 
  Original Tweet: '${originalText.replace(/'/g, "\\'")}' 
  Reply: '${firstReply.replace(/'/g, "\\'")}'
  Tell me about Tweet Context`;

  // Prompt for casual reply
  const replyPrompt = `You are a casual Twitter user. Based on this context, respond naturally as if replying to the conversation: 
  Original Tweet: '${originalText.replace(/'/g, "\\'")}' 
  Reply: '${firstReply.replace(/'/g, "\\'")}'
  Post a reply as a normal user`;

  try {
    // Context evaluation using Gemini
    const contextResult = await model.generateContent(contextPrompt);
    const contextResponse = contextResult.response.text();

    // Reply generation using Gemini
    const replyResult = await model.generateContent(replyPrompt);
    const userReply = replyResult.response.text();

    console.log("🟢 AI Context Evaluation:", contextResponse);
    console.log("🟢 AI Generated Reply:", userReply);

    return {
      originalTweet: tweet.originalTweet,
      replies: tweet.replies,
      aiReply: userReply
    };
  } catch (error) {
    console.error("Error processing Gemini AI request:", error);
    return null;
  }
};

const analyzeAndSaveTweets = async () => {
  const tweets = loadTweets();
  if (tweets.length === 0) {
    console.log("No tweets found to analyze. Exiting analysis...");
    return;
  }

  const toBeReplied = [];
  for (const tweet of tweets) {
    const result = await analyzeTweet(tweet);
    if (result) {
      toBeReplied.push(result);
    }
  }

  if (toBeReplied.length > 0) {
    saveToBeReplied(toBeReplied);
  } else {
    console.log("No tweets to be replied.");
  }
};

module.exports = { analyzeAndSaveTweets };

