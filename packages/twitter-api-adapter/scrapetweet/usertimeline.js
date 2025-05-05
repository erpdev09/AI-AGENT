const needle = require('needle');
const fs = require('fs');

const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";
const bearerToken = 'AAAAAAAAAAAAAAAAAAAAADkz1AEAAAAAs8iiwEKk4aUb5P5BA7AunSz%2B5fg%3D88Dw6YrqGvMkL3KNGe0ixSzzFETcjWP60fDHNvCq7FK6qdtrev'; // replace with env var in production

async function searchMentions() {
    const params = {
        "query": "(from:rilso_y) (@Elisabethxbt)",
        "max_results": 10, // must be 10–100
        "tweet.fields": "created_at,author_id"
    };

    const options = {
        headers: {
            "User-Agent": "v2SearchMentionsJS",
            "authorization": `Bearer ${bearerToken}`
        }
    };

    try {
        const response = await needle("get", endpointUrl, params, options);
        
        if (response.statusCode !== 200) {
            console.error(`Error: ${response.statusCode} ${response.statusMessage}`);
            console.error(response.body);
        } else {
            console.log("Tweets where @rilso_y mentioned @Elisabethxbt:");
            console.dir(response.body, { depth: null });

            // Save response to JSON file
            fs.writeFileSync('twitter_mentions.json', JSON.stringify(response.body, null, 2));
            console.log("Response saved to twitter_mentions.json");
        }

        // 🔍 Log rate limit headers
        const headers = response.headers;
        console.log("\nRate Limit Info:");
        console.log(`Limit: ${headers['x-rate-limit-limit']}`);
        console.log(`Remaining: ${headers['x-rate-limit-remaining']}`);
        const resetTime = new Date(parseInt(headers['x-rate-limit-reset'], 10) * 1000);
        console.log(`Resets at: ${resetTime.toLocaleString()}`);

    } catch (err) {
        console.error("Request failed:", err);
    }
}

searchMentions();
