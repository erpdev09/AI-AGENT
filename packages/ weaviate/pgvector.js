const { Pool } = require('pg');
const weaviate = require('weaviate-client');

// PostgreSQL connection pool
const pool = new Pool({
  user: 'myuser',
  host: 'localhost',
  database: 'my_new_database',
  password: 'Koireng@1',
  port: 5432,
});

// Initialize Weaviate client
async function initializeClient() {
  const client = weaviate.client({
    scheme: 'http',
    host: 'localhost:8080',
  });
  await client.misc.metaGetter().do(); // test connection
  return client;
}

// Create Weaviate schema for tweets
async function createTweetSchema(client) {
  try {
    await client.schema.classDeleter().withClassName('Tweet').do();
  } catch (err) {
    // Ignore if schema doesn't exist
  }

  const schema = {
    class: 'Tweet',
    description: 'Stores social media tweets',
    vectorizer: 'text2vec-transformers',
    moduleConfig: { 'text2vec-transformers': {} },
    properties: [
      { name: 'tweet_id', dataType: ['string'] },
      { name: 'user_name', dataType: ['string'] },
      { name: 'content', dataType: ['text'] },
      { name: 'tweet_link', dataType: ['string'] },
      { name: 'tweet_link_extra', dataType: ['string'] },
      { name: 'is_replied_tweet', dataType: ['boolean'] },
      { name: 'is_direct_tag', dataType: ['boolean'] },
      { name: 'created_at', dataType: ['date'] },
      { name: 'updated_at', dataType: ['date'] },
      { name: 'action_perform', dataType: ['string'] },
    ],
  };
  await client.schema.classCreator().withClass(schema).do();
  console.log('✅ Schema created in Weaviate');
}

// Fetch tweets from PostgreSQL
async function fetchTweets() {
  const res = await pool.query(`
    SELECT tweet_id, user_name, tweet_content, tweet_link, tweet_link_extra,
           is_replied_tweet, is_direct_tag, created_at, updated_at, action_perform
    FROM tweets1
  `);
  return res.rows;
}

// Insert a tweet into Weaviate
async function insertTweet(client, tweet) {
  await client.data.creator().withClassName('Tweet').withProperties({
    tweet_id: tweet.tweet_id.toString(),
    user_name: tweet.user_name,
    content: tweet.tweet_content,
    tweet_link: tweet.tweet_link,
    tweet_link_extra: tweet.tweet_link_extra || null,
    is_replied_tweet: tweet.is_replied_tweet,
    is_direct_tag: tweet.is_direct_tag,
    created_at: tweet.created_at ? tweet.created_at.toISOString() : null,
    updated_at: tweet.updated_at ? tweet.updated_at.toISOString() : null,
    action_perform: tweet.action_perform != null ? String(tweet.action_perform) : null,
  }).do();
}

/**
 * FUNCTION 1: Giveaway Detection and Analysis
 */

// Define giveaway terms as constants at the top level
const GIVEAWAY_TERMS = ['giveaway', 'gw', 'gift', 'give', 'campaign'];
const PEOPLE_TERMS = ['other people', 'other peep', 'other guys', 'participants', 'users', 'members'];

// ❌ Detect tweets about giveaways to others
function isGiveawayContext(content, giveawayTerms = GIVEAWAY_TERMS, peopleTerms = PEOPLE_TERMS) {
  const lower = content.toLowerCase();
  return giveawayTerms.some(gw =>
    peopleTerms.some(pt => lower.includes(gw) && lower.includes(pt))
  );
}

// 🚀 Main function for syncing giveaways
async function syncGiveaways(searchQuery = GIVEAWAY_TERMS, filterGiveawayTerms = GIVEAWAY_TERMS, filterPeopleTerms = PEOPLE_TERMS) {
  const client = await initializeClient();
  
  // Create schema
  await createTweetSchema(client);
  
  // Fetch tweets
  const tweets = await fetchTweets();
  
  let insertedCount = 0;

  // Insert into Weaviate (with giveaway filtering)
  for (const tweet of tweets) {
    if (isGiveawayContext(tweet.tweet_content, filterGiveawayTerms, filterPeopleTerms)) {
      continue; // skip tweets about giveaways to others
    }

    await insertTweet(client, tweet);
    insertedCount++;
  }

  console.log(`✅ Inserted ${insertedCount} filtered tweets into Weaviate.`);

  // 🔍 Semantic search for giveaways
  const searchTerms = Array.isArray(searchQuery) ? searchQuery : [searchQuery];
  const result = await client.graphql
    .get()
    .withClassName('Tweet')
    .withNearText({ concepts: searchTerms })
    .withFields('tweet_id user_name content tweet_link tweet_link_extra created_at _additional { distance }')
    .withLimit(5)
    .do();

  return result.data.Get.Tweet;
}

/**
 * FUNCTION 2: Solana Data Extraction and Search
 */

// Define Solana-related constants at the top level
const SOLANA_BASE58_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
const SOLANA_AMOUNT_REGEX = /\b\d{1,3}(?:\.\d{1,9})?\b/g;
const SOLANA_KEYWORDS = ['swap', 'send', 'transfer', 'transferred', 'sending', 'swapped'];
const SOLANA_SYMBOLS = ['sol', 'solana', 'usdc', 'usdt', 'bonk', 'jito'];
const DEFAULT_SOLANA_SEARCH_QUERY = 'solana';

// 🔍 Extract contract, token amount, keywords, and token symbol
function extractSolanaData(
  content, 
  base58Regex = SOLANA_BASE58_REGEX, 
  amountRegex = SOLANA_AMOUNT_REGEX,
  keywordsList = SOLANA_KEYWORDS, 
  symbolsList = SOLANA_SYMBOLS
) {
  const contracts = [];
  const tokenAmounts = [];
  const keywords = [];
  const symbols = [];

  const lowerContent = content.toLowerCase();

  const contractMatches = content.match(base58Regex);
  if (contractMatches) contracts.push(...contractMatches);

  const amountMatches = content.match(amountRegex);
  if (amountMatches) {
    amountMatches.forEach(val => {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0 && num <= 1000) {
        tokenAmounts.push(num);
      }
    });
  }

  keywordsList.forEach(k => {
    if (lowerContent.includes(k)) keywords.push(k);
  });

  symbolsList.forEach(s => {
    if (lowerContent.includes(s)) symbols.push(s);
  });

  return { contracts, tokenAmounts, keywords, symbols };
}

// 🚀 Main function for syncing tweets and search with Solana data extraction
async function syncTweetsAndSearch(
  searchQuery = DEFAULT_SOLANA_SEARCH_QUERY, 
  extractionKeywords = SOLANA_KEYWORDS,
  extractionSymbols = SOLANA_SYMBOLS,
  extractionBase58Regex = SOLANA_BASE58_REGEX,
  extractionAmountRegex = SOLANA_AMOUNT_REGEX
) {
  const client = await initializeClient();
  
  // Create schema
  await createTweetSchema(client);
  
  // Fetch tweets
  const tweets = await fetchTweets();

  // Insert all tweets into Weaviate
  for (const tweet of tweets) {
    await insertTweet(client, tweet);
  }

  console.log(`✅ Inserted ${tweets.length} tweets into Weaviate.`);

  // 🔍 Semantic search
  const searchTerms = Array.isArray(searchQuery) ? searchQuery : [searchQuery];
  const result = await client.graphql
    .get()
    .withClassName('Tweet')
    .withNearText({ concepts: searchTerms })
    .withFields('tweet_id user_name content tweet_link tweet_link_extra created_at _additional { distance }')
    .withLimit(5)
    .do();

  // 📤 Format + extract from content
  const enrichedResults = result.data.Get.Tweet.map(tweet => {
    const extracted = extractSolanaData(
      tweet.content,
      extractionBase58Regex,
      extractionAmountRegex,
      extractionKeywords,
      extractionSymbols
    );
    return { ...tweet, extracted };
  });

  return enrichedResults;
}

module.exports = {
  syncGiveaways,
  syncTweetsAndSearch,
  pool, // optionally export if you want to close it manually elsewhere
};