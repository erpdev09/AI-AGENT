const {syncTweetsAndSearch} = require('../../../packages/ weaviate/pgvector'); // Adjust path accordingly

async function main() {
  const query = 'airdrop,solana,token'; // Example query

  try {
    const results = await syncTweetsAndSearch(query);

    console.log(`Found ${results.length} tweets:\n`);
    results.forEach((tweet, index) => {
      console.log(`Tweet ${index + 1}:`);
      console.log(`User: ${tweet.user_name}`);
      console.log(`Content: ${tweet.content}`);
      console.log(`Created At: ${tweet.created_at}`);
      console.log(`Distance: ${tweet.distance}`);
      console.log(`Link: ${tweet.tweet_link}`);
      console.log(`Contracts: ${tweet.extracted.contracts.join(', ')}`);
      console.log(`Symbols: ${tweet.extracted.symbols.join(', ')}`);
      console.log(`Keywords: ${tweet.extracted.keywords.join(', ')}`);
      console.log(`Token Amounts: ${JSON.stringify(tweet.extracted.tokenAmounts)}`);
      console.log('---\n');
    });
  } catch (err) {
    console.error('Search failed:', err.message);
  }
}

main();
