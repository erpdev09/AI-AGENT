const { syncGiveaways } = require('./pgvector');

(async () => {
  try {
    const results = await syncGiveaways('giveaways'); // You can change the search term
    console.log('🔍 Top results:', results);
  } catch (error) {
    console.error('❌ Error during sync:', error);
  }
})();
