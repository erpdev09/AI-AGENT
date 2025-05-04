const { getTweets } = require('./getTweets'); // Import the getTweets function

// Use async/await to fetch data from `tweets1`
(async () => {
    try {
        const tweets = await getTweets();
        console.log('Tweets fetched:', tweets);
    } catch (err) {
        console.error('❌ Error:', err);
    }
})();
