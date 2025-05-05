const { syncGiveaways } = require('../../../packages/ weaviate/pgvector');

/**
 * Runs a semantic search on giveaways using the provided query string.
 * @param {string} query - Comma-separated keywords for search.
 * @returns {Promise<Array>} - Array of giveaway search results.
 */
async function searchGiveaways(query) {
  try {
    const results = await syncGiveaways(query);

    return results.map(tweet => ({
      content: tweet.content,
      user_name: tweet.user_name,
      tweet_id: tweet.tweet_id,
      tweet_link: tweet.tweet_link,
      tweet_link_extra: tweet.tweet_link_extra || null,
      created_at: tweet.created_at,
      distance: tweet._additional?.distance,
      extracted: {
        contracts: tweet.extracted.contracts || [],
        tokenAmounts: tweet.extracted.tokenAmounts || [],
        keywords: tweet.extracted.keywords || [],
        symbols: tweet.extracted.symbols || [],
      },
    }));
  } catch (error) {
    console.error('Error during semantic giveaway search:', error);
    throw error;
  }
}

module.exports = { searchGiveaways };
