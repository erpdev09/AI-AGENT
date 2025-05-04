const { syncTweetsAndSearch } = require('../../../packages/ weaviate/pgvector');

const query = 'swap'; // Change as needed

syncTweetsAndSearch(query)
  .then(results => {
    console.log('\n🔍 Semantic Search Results:\n');
    results.forEach(tweet => {
      console.log(`- "${tweet.content}" by ${tweet.user_name}`);
      console.log(`  🆔 Tweet ID: ${tweet.tweet_id}`);
      console.log(`  🔗 Link: ${tweet.tweet_link}`);
      console.log(`  ⏰ Created: ${tweet.created_at}`);
      console.log(`  📏 Distance: ${tweet._additional.distance}`);

      const { contracts, tokenAmounts, keywords, symbols } = tweet.extracted;
      if (contracts.length) console.log(`  📜 Contracts: ${contracts.join(', ')}`);
      if (tokenAmounts.length) console.log(`  💰 Token Amounts: ${tokenAmounts.join(', ')}`);
      if (keywords.length) console.log(`  🧩 Keywords: ${keywords.join(', ')}`);
      if (symbols.length) console.log(`  🪙 Symbols: ${symbols.join(', ')}`);

      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ Error during tweet sync and search:', err.message);
  });
