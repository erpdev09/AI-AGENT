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

// 🔍 Extract contract, token amount, keywords, and token symbol
function extractSolanaData(content) {
  const base58Regex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
  const amountRegex = /\b\d{1,3}(?:\.\d{1,9})?\b/g;
  const keywordsList = ['swap', 'send', 'transfer', 'transferred', 'sending', 'swapped'];
  const symbolsList = ['sol', 'solana', 'usdc', 'usdt', 'bonk', 'jito'];

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

// 🚀 Main function
async function syncTweetsAndSearch(searchQuery = 'solana') {
  const client = await initializeClient();

  try {
    await client.schema.classDeleter().withClassName('Tweet').do();
  } catch (err) {
    // Ignore if schema doesn't exist
  }

  // ✅ Create schema
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

  // 📥 Fetch tweets
  const res = await pool.query(`
    SELECT tweet_id, user_name, tweet_content, tweet_link, tweet_link_extra,
           is_replied_tweet, is_direct_tag, created_at, updated_at, action_perform
    FROM tweets1
  `);
  const tweets = res.rows;

  // 🔄 Insert into Weaviate
  for (const tweet of tweets) {
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

  console.log(`✅ Inserted ${tweets.length} tweets into Weaviate.`);

  // 🔍 Semantic search
  const result = await client.graphql
    .get()
    .withClassName('Tweet')
    .withNearText({ concepts: [searchQuery] })
    .withFields('tweet_id user_name content tweet_link tweet_link_extra created_at _additional { distance }')
    .withLimit(5)
    .do();

  // ❌ Do NOT end the pool here, so it remains open for reuse

  // 📤 Format + extract from content
  const enrichedResults = result.data.Get.Tweet.map(tweet => {
    const extracted = extractSolanaData(tweet.content);
    return { ...tweet, extracted };
  });

  return enrichedResults;
}

module.exports = {
  syncTweetsAndSearch,
  pool, // optionally export if you want to close it manually elsewhere
};
