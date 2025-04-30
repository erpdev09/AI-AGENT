const weaviate = require('weaviate-client');

// Initialize Weaviate client
async function initializeClient() {
  try {
    const client = weaviate.client({
      scheme: 'http',
      host: 'localhost:8080'
    });
    console.log('Client initialized:', client);
    // Validate connection
    const meta = await client.misc.metaGetter().do();
    console.log('Connected to Weaviate:', meta.version);
    return client;
  } catch (error) {
    throw new Error(`Failed to connect to Weaviate: ${error.message}`);
  }
}

// Sample social media posts
const socialData = [
  { text: "Just saw an amazing sunset! #nature", user: "alice", timestamp: "2025-04-30T10:00:00Z" },
  { text: "Loving the new AI features in Grok! #xAI", user: "bob", timestamp: "2025-04-30T11:00:00Z" },
  { text: "Anyone else enjoying the evening dirty vibe? #sunset", user: "charlie", timestamp: "2025-04-30T12:00:00Z" }
];

// Main function
async function main() {
  let client;
  try {
    // Initialize client
    client = await initializeClient();

    // Step 1: Delete existing schema (if any)
    try {
      await client.schema.classDeleter().withClassName('SocialPost').do();
      console.log('Existing schema deleted');
    } catch (e) {
      // Ignore if schema doesn't exist
    }

    // Step 2: Create schema
    const schema = {
      class: 'SocialPost',
      description: 'Stores social media posts',
      vectorizer: 'text2vec-transformers',
      moduleConfig: {
        'text2vec-transformers': {}
      },
      properties: [
        { name: 'text', dataType: ['text'] },
        { name: 'user', dataType: ['string'] },
        { name: 'timestamp', dataType: ['date'] }
      ]
    };
    await client.schema.classCreator().withClass(schema).do();
    console.log('Schema created');

    // Step 3: Store social posts
    for (const post of socialData) {
      await client.data
        .creator()
        .withClassName('SocialPost')
        .withProperties({
          text: post.text,
          user: post.user,
          timestamp: post.timestamp
        })
        .do();
      console.log(`Stored post: ${post.text}`);
    }

    // Step 4: Perform semantic search
    const queryText = 'dirty';
    const result = await client.graphql
      .get()
      .withClassName('SocialPost')
      .withNearText({ concepts: [queryText] })
      .withFields('text user timestamp _additional { distance }')
      .withLimit(2)
      .do();

    console.log('Search results:');
    result.data.Get.SocialPost.forEach(post => {
      console.log(`Text: ${post.text}, User: ${post.user}, Distance: ${post._additional.distance}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();