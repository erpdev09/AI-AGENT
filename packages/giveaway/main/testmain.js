const { syncGiveaways} = require('../../../packages/ weaviate/pgvector');

/**
 * Main function to test the giveaway search functionality.
 */
async function main() {
  try {
    const results = await syncGiveaways();

    console.log('Giveaway Search Results:');
    if (results.length > 0) {
      results.forEach((result, index) => {
        console.log(`Result ${index + 1}:`);
        console.log(`  Tweet ID: ${result.tweet_id}`);
        console.log(`  User Name: ${result.user_name}`);
        console.log(`  Content: ${result.content}`);
        console.log(`  Tweet Link: ${result.tweet_link}`);
        console.log(`  Created At: ${result.created_at}`);
        console.log(`  Distance: ${result.distance}`);
        console.log('-----------------------------');
      });
    } else {
      console.log('No giveaway tweets found.');
    }
  } catch (error) {
    console.error('Error running the giveaway search:', error);
  }
}

// Run the main function
main();
