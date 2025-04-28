const { GoogleGenerativeAI } = require("@google/generative-ai");
const pool = require("../config/dbconnect");
const fs = require("fs");

// Load character persona
const character = JSON.parse(fs.readFileSync('../pipeline/sentiment/character.json', 'utf8'));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyDVT7gUed34cz4cw49rMRJQiK_loWRO3wM");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Fetch tweets + replies from DB
const fetchTweetsFromDB = async () => {
  try {
    const tweetQuery = `SELECT tweet_id, text, author FROM tweets;`;
    const replyQuery = `SELECT tweet_id, text, author, is_ai_reply FROM replies;`;

    const tweetsResult = await pool.query(tweetQuery);
    const repliesResult = await pool.query(replyQuery);

    const repliesMap = {};
    repliesResult.rows.forEach(reply => {
      if (!repliesMap[reply.tweet_id]) repliesMap[reply.tweet_id] = [];
      repliesMap[reply.tweet_id].push({
        text: reply.text,
        author: reply.author,
        isAIReply: reply.is_ai_reply,
      });
    });

    return tweetsResult.rows.map(tweet => ({
      originalTweet: {
        tweetId: tweet.tweet_id,
        text: `${tweet.text}`,
        author: tweet.author,
      },
      replies: repliesMap[tweet.tweet_id] || [],
    }));
  } catch (error) {
    console.error("Error fetching tweets from DB:", error);
    return [];
  }
};

// Generate an AI reply that fits the thread
const analyzeTweet = async (tweet) => {
  const { originalTweet, replies } = tweet;

  if (!originalTweet || !originalTweet.text) {
    console.warn("⚠️ Invalid tweet format. Skipping.");
    return null;
  }

  // Check if an AI reply already exists in the database or replies
  if (replies.some(r => r.isAIReply)) {
    console.log(`⏭️ AI already replied to tweet_id ${originalTweet.tweetId}. Skipping.`);
    return null;
  }

  // Build thread context (original + replies)
  const threadContext = [
    `original (${originalTweet.author}): ${originalTweet.text}`,
    ...replies.map((r, i) => `reply ${i + 1} (${r.isAIReply ? "AI_Bot" : r.author}): ${r.text}`)
  ].join('\n');

  const prompt = `
you are elisabeth — 18, clever, chaotic, and unpredictable. your voice is sharp, lowercase, funny, and smart. no fluff. no cringe. no obvious replies.

Bio: ${JSON.stringify(character.bio)}
Style: ${JSON.stringify(character.style.chat)}

This is the tweet thread:
${threadContext}

write the next reply in this thread — bold, on-brand, 20–30 words. don’t repeat anything that’s already been said. make it smart and true to elisabeth.
  `;

  try {
    const replyResult = await model.generateContent(prompt);
    const aiReply = replyResult.response.text().trim();

    // Crude duplicate protection: Ensure no exact or near-duplicate reply is generated
    const isDuplicate = replies.some(r =>
      r.isAIReply && r.text.toLowerCase().includes(aiReply.toLowerCase().slice(0, 12))
    );
    if (isDuplicate) {
      console.log("⚠️ Duplicate reply detected. Skipping.");
      return null;
    }

    console.log("🟢 AI Generated Reply:", aiReply);
    return {
      originalTweet,
      aiReply,
    };
  } catch (error) {
    console.error("❌ Error generating reply:", error);
    return null;
  }
};

// Save AI reply to DB
const saveAIRepliesToDB = async (aiReplies) => {
  try {
    for (const reply of aiReplies) {
      const { tweetId } = reply.originalTweet;

      // Check if AI reply already exists in the database
      const existsQuery = `
        SELECT 1 FROM replies 
        WHERE tweet_id = $1 AND is_ai_reply = true 
        LIMIT 1;
      `;
      const exists = await pool.query(existsQuery, [tweetId]);

      if (exists.rowCount > 0) {
        console.log(`⏭️ Already replied to tweet_id ${tweetId}. Skipping insert.`);
        continue;
      }

      const insertQuery = `
        INSERT INTO replies (tweet_id, text, author, is_ai_reply)
        VALUES ($1, $2, $3, $4);
      `;
      await pool.query(insertQuery, [
        tweetId,
        reply.aiReply,
        "AI_Bot",
        true
      ]);

      console.log(`💬 Reply saved for tweet_id ${tweetId}`);
    }

    console.log("✅ All AI replies saved.");
  } catch (error) {
    console.error("❌ Error saving replies to DB:", error);
  }
};

// Main execution function
const analyzeAndSaveTweets = async () => {
  const tweets = await fetchTweetsFromDB();
  if (tweets.length === 0) {
    console.log("📭 No tweets found to process.");
    return;
  }

  const aiReplies = [];
  for (const tweet of tweets) {
    const result = await analyzeTweet(tweet);
    if (result) aiReplies.push(result);
  }

  if (aiReplies.length > 0) {
    await saveAIRepliesToDB(aiReplies);
  } else {
    console.log("📌 No new AI replies generated.");
  }
};

module.exports = { analyzeAndSaveTweets };
