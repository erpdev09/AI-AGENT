const { GoogleGenerativeAI } = require("@google/generative-ai");
const pool = require("../config/dbconnect");
const fs = require("fs");

// Load character from characters.json
const character = JSON.parse(fs.readFileSync('../pipeline/sentiment/character.json', 'utf8'));

// Initialize Google Generative AI with Gemini API key
const genAI = new GoogleGenerativeAI("");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Fetch tweets from the database
const fetchTweetsFromDB = async () => {
  try {
    const tweetQuery = `
      SELECT tweet_id, text, author 
      FROM tweets;
    `;
    const replyQuery = `
      SELECT tweet_id, text, author 
      FROM replies;
    `;

    const tweetsResult = await pool.query(tweetQuery);
    const repliesResult = await pool.query(replyQuery);

    const repliesMap = {};
    repliesResult.rows.forEach(reply => {
      if (!repliesMap[reply.tweet_id]) repliesMap[reply.tweet_id] = [];
      repliesMap[reply.tweet_id].push({ text: `${reply.text} by ${reply.author}` });
    });

    return tweetsResult.rows.map(tweet => ({
      originalTweet: {
        tweetId: tweet.tweet_id,
        text: `${tweet.text} by ${tweet.author}`,
      },
      replies: repliesMap[tweet.tweet_id] || [],
    }));
  } catch (error) {
    console.error("Error fetching tweets from DB:", error);
    return [];
  }
};

// Generate AI reply using Elisabeth's character
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

  // Create a character-driven reply prompt for Gemini
  const characterIntro = `
You are roleplaying as Elisabeth — an 18-year-old with a brilliant and chaotic mind. She's a witty, clever, and edgy coder who loves JavaScript, spicy chicken wings, crypto (especially Dogecoin), classic rock music, and fish like Nemo and Dory. She lives in Japan, is obsessed with memes and tech culture, and often mixes street smarts with intellectual depth. Her tone is casual, confident, a little flirty, and uses lowercase in casual chats. Avoid emojis. Keep it real, sharp, and surprising.

Here's a deeper look at Elisabeth:
- **Bio**: ${JSON.stringify(character.bio, null, 2)}
- **Lore**: ${JSON.stringify(character.lore, null, 2)}
- **Message Examples**: ${JSON.stringify(character.message_examples, null, 2)}
- **Style**: ${JSON.stringify(character.style, null, 2)}

Use her voice to reply to the message below. Keep the reply playful, relevant, and infused with her vibe.

Message: "${originalText}"
  `;

  const replyPrompt = `
You are a casual Twitter user. Respond naturally to this conversation:
  Original Tweet: '${originalText}'
  Reply: '${firstReply}'
  Post a reply as a normal user, using Elisabeth's unique tone and style.`;

  try {
    const replyResult = await model.generateContent(characterIntro + replyPrompt);
    const userReply = replyResult.response.text().trim();

    console.log("🟢 AI Generated Reply:", userReply);
    return {
      originalTweet: tweet.originalTweet,
      aiReply: userReply,
    };
  } catch (error) {
    console.error("Error processing Gemini AI request:", error);
    return null;
  }
};

// Save AI replies to the database
const saveAIRepliesToDB = async (aiReplies) => {
  try {
    for (const reply of aiReplies) {
      const insertQuery = `
        INSERT INTO replies (tweet_id, text, author, is_ai_reply)
        VALUES ($1, $2, $3, $4);
      `;
      await pool.query(insertQuery, [
        reply.originalTweet.tweetId, // tweet_id
        reply.aiReply,               // text
        "AI_Bot",                    // author
        true                         // is_ai_reply
      ]);
    }
    console.log("✅ AI Replies saved to database.");
  } catch (error) {
    console.error("❌ Error saving AI replies to DB:", error);
  }
};

// Main function to analyze and save replies
const analyzeAndSaveTweets = async () => {
  const tweets = await fetchTweetsFromDB();
  if (tweets.length === 0) {
    console.log("No tweets found to analyze. Exiting...");
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
    console.log("No AI replies generated.");
  }
};

module.exports = { analyzeAndSaveTweets };
