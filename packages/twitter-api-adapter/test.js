// test.js
const { searchMentions } = require('./scrapetweet/usertimeline');

(async () => {
    const mentions = await searchMentions();
    if (mentions) {
        console.log("Mentions retrieved successfully.");
    } else {
        console.log("Failed to retrieve mentions.");
    }
})();
