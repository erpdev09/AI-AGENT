const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

const baseURL = "https://api.aimlapi.com/v1";
const apiKey = "a84bd072398746d7aabde062456652c6";

const api = new OpenAI({
  apiKey,
  baseURL,
});

const loadTweets = () => {
  try {
    const filePath = path.join(__dirname, "../twitter-scrapper/temp", "scraped_tweets.json");
    if (!fs.existsSync(filePath)) {
      console.error("Error: scraped_tweets.json not found!");
      return [];
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading scraped_tweets.json:", error);
    return [];
  }
};

const analyzeTweet = async (tweet) => {
  if (!tweet.originalTweet || !tweet.originalTweet.text) {
    console.warn("Skipping tweet: Invalid data format");
    return;
  }

  const originalText = tweet.originalTweet.text;
  const firstReply = tweet.replies.length > 0 ? tweet.replies[0].text : "No replies yet.";

  console.log("\n🔹 Evaluating Tweet Thread...");
  console.log("Original Tweet:", originalText);
  console.log("First Reply:", firstReply);

  const systemPrompt = `You are an Evaluator of Tweets on Twitter. You can determine the context of tweets. Now evaluate this: 
  Original Tweet: '${originalText}' 
  Reply: '${firstReply}'`;

  const userPrompt = "Tell me about Tweet Context";

  const replySystemPrompt = `You are a casual Twitter user. Based on this context, respond naturally as if replying to the conversation: 
  Original Tweet: '${originalText}' 
  Reply: '${firstReply}'`;

  const replyUserPrompt = "Post a reply as a normal user";

  try {
    // First API call: Evaluate tweet context
    const contextCompletion = await api.chat.completions.create({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 256,
    });

    const contextResponse = contextCompletion.choices[0].message.content;

    // Second API call: Generate casual user reply
    const replyCompletion = await api.chat.completions.create({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [
        { role: "system", content: replySystemPrompt },
        { role: "user", content: replyUserPrompt },
      ],
      temperature: 0.9,
      max_tokens: 128,
    });

    const userReply = replyCompletion.choices[0].message.content;

    console.log("🟢 AI Context Evaluation:", contextResponse);
    console.log("🟢 AI Generated Reply:", userReply);
  } catch (error) {
    console.error("Error processing AI request:", error);
  }
};

const main = async () => {
  const tweets = loadTweets();
  if (tweets.length === 0) {
    console.log("No tweets found. Exiting...");
    return;
  }

  for (const tweet of tweets) {
    await analyzeTweet(tweet);
  }
};

main();
