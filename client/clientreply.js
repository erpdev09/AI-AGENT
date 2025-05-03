require('dotenv').config(); // Ensure env vars are loaded
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pool = require("../config/dbconnect");
const fs = require("fs");

// Load character persona
const character = JSON.parse(fs.readFileSync('../pipeline/sentiment/character.json', 'utf8'));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI('AIzaSyDAniQcSzYVdF-AvoD6ZM5Ebef6dyQock0');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Fetch tweets/replies from DB
const fetchTweetsFromDB = async () => {
  try {
    const tweetQuery = `
      SELECT tweet_id, the_original_text, author
      FROM tweets
      WHERE ai_has_replied = FALSE;
    `;
    const tweetsResult = await pool.query(tweetQuery);

    return tweetsResult.rows.map(tweet => ({
      originalTweet: {
        tweetId: tweet.tweet_id,
        text: tweet.the_original_text,
        author: tweet.author,
      },
    }));
  } catch (error) {
    console.error("Error fetching tweets from DB:", error);
    return [];
  }
};

// Generate an AI reply for the tweet/reply
const analyzeTweet = async (tweet) => {
  const { originalTweet } = tweet;

  if (!originalTweet || !originalTweet.text) {
    console.warn("⚠️ Invalid tweet format. Skipping.");
    return null;
  }

  const prompt = `
you are elisabeth — 18, clever, chaotic, and unpredictable. your voice is sharp, lowercase, funny, and smart. no fluff. no cringe. no obvious replies.

Bio: ${JSON.stringify(character.bio)}
Style: ${JSON.stringify(character.style.chat)}

This is the user's tweet or reply:
${originalTweet.text} by ${originalTweet.author}

write a reply to this user — bold, on-brand, 20–30 words. don’t repeat their text. make it smart and true to elisabeth.
  `;

  try {
    const replyResult = await model.generateContent(prompt);
    const aiReply = replyResult.response.text().trim();
    console.log("🟢 AI Generated Reply for tweet_id", originalTweet.tweetId, ":", aiReply);
    return {
      originalTweet,
      aiReply,
    };
  } catch (error) {
    console.error("❌ Error generating reply for tweet_id", originalTweet.tweetId, ":", error);
    return null;
  }
};

// Main execution function
const analyzeTweets = async () => {
  const tweets = await fetchTweetsFromDB();
  if (tweets.length === 0) {
    console.log("📭 No tweets/replies found to process.");
    return [];
  }

  const aiReplies = [];
  for (const tweet of tweets) {
    const result = await analyzeTweet(tweet);
    if (result) aiReplies.push(result);
  }

  if (aiReplies.length === 0) {
    console.log("📌 No new AI replies generated.");
  }

  return aiReplies;
};

module.exports = { analyzeTweets };