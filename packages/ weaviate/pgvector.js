const { Pool } = require('pg');
const weaviate = require('weaviate-client');

// PostgreSQL connection
const pool = new Pool({
  user: 'myuser',
  host: 'localhost',
  database: 'my_new_database',
  password: 'Koireng@1',
  port: 5432,
});

// Initialize Weaviate
async function initializeClient() {
  const client = weaviate.client({
    scheme: 'http',
    host: 'localhost:8080', // adjust if needed
  });

  await client.misc.metaGetter().do(); // test connection
  return client;
}

// Main function
async function main() {
  const client = await initializeClient();

  // Delete schema if exists
  try {
    await client.schema.classDeleter().withClassName('Tweet').do();
  } catch (err) {
    // Ignore if class doesn't exist
  }

  // Create schema in Weaviate
  const schema = {
    class: 'Tweet',
    description: 'Stores social media tweets',
    vectorizer: 'text2vec-transformers',
    moduleConfig: {
      'text2vec-transformers': {},
    },
    properties: [
      { name: 'tweet_id', dataType: ['string'] }, // Store tweet_id
      { name: 'text', dataType: ['text'] }, // Maps to the_original_text
      { name: 'author', dataType: ['string'] },
      { name: 'timestamp', dataType: ['date'] }, // Store timestamp
      { name: 'ai_reply', dataType: ['text'] }, // Maps to ai_replied_text
      { name: 'is_ai_replied', dataType: ['boolean'] }, // Maps to ai_has_replied
    ],
  };
  await client.schema.classCreator().withClass(schema).do();
  console.log('Schema created in Weaviate');

  // Fetch tweets from Postgres
  const res = await pool.query('SELECT tweet_id, the_original_text, author, timestamp, ai_has_replied, ai_replied_text FROM tweets');
  const tweets = res.rows;

  // Insert tweets into Weaviate
  for (const tweet of tweets) {
    await client.data.creator().withClassName('Tweet').withProperties({
      tweet_id: tweet.tweet_id.toString(), // Convert to string for Weaviate
      text: tweet.the_original_text,
      author: tweet.author,
      timestamp: tweet.timestamp.toISOString(), // Convert to ISO string for Weaviate
      ai_reply: tweet.ai_replied_text,
      is_ai_replied: tweet.ai_has_replied,
    }).do();
    console.log(`Inserted: ${tweet.the_original_text}`);
  }

  // Perform semantic search
  const searchQuery = 'bullshit';
  const result = await client.graphql
    .get()
    .withClassName('Tweet')
    .withNearText({ concepts: [searchQuery] })
    .withFields('tweet_id text author timestamp ai_reply is_ai_replied _additional { distance }')
    .withLimit(3)
    .do();

  console.log('\n🔍 Semantic search results for:', `"${searchQuery}"`);
  result.data.Get.Tweet.forEach(tweet => {
    console.log(`\n- "${tweet.text}" by ${tweet.author}`);
    console.log(`  🆔 Tweet ID: ${tweet.tweet_id}`);
    console.log(`  ⏰ Timestamp: ${tweet.timestamp}`);
    if (tweet.ai_reply) console.log(`  💬 AI Reply: ${tweet.ai_reply}`);
    console.log(`  🔎 Distance: ${tweet._additional.distance}`);
  });

  await pool.end(); // Close PostgreSQL connection
}

main().catch(err => console.error('❌ Error:', err.message));