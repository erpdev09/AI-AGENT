const needle = require('needle');
const fs = require('fs');

const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";
const bearerToken = ''; // replace with env var in production

async function searchMentions() {
    const params = {
        "query": "(from:rilso_y) (@Elisabethxbt)",
        "max_results": 10,
        "tweet.fields": "created_at,author_id,text"
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
            return null;
        }

        const tweets = response.body.data || [];

        // Enrich the tweet data
        const formattedTweets = tweets.map(tweet => {
            const hasMention = tweet.text.includes('@');
            const username = 'rilso_y'; // since query is (from:rilso_y), hardcoded here
            const tweetLink = `https://x.com/${username}/status/${tweet.id}`;

            return {
                tweet_id: tweet.id,
                user_name: username,
                tweet_content: tweet.text,
                tweet_link: tweetLink,
                tweet_link_extra: tweetLink,
                is_replied_tweet: hasMention,
                is_direct_tag: false, // logic could be updated if needed
                created_at: new Date(tweet.created_at).toISOString(),
                updated_at: new Date().toISOString(),
                action_perform: false
            };
        });

        console.log("Formatted Tweets:");
        console.dir(formattedTweets, { depth: null });

        fs.writeFileSync('twitter_mentions.json', JSON.stringify(formattedTweets, null, 2));
        console.log("Response saved to twitter_mentions.json");

        // Rate limit info
        const headers = response.headers;
        console.log("\nRate Limit Info:");
        console.log(`Limit: ${headers['x-rate-limit-limit']}`);
        console.log(`Remaining: ${headers['x-rate-limit-remaining']}`);
        const resetTime = new Date(parseInt(headers['x-rate-limit-reset'], 10) * 1000);
        console.log(`Resets at: ${resetTime.toLocaleString()}`);

        return formattedTweets;
    } catch (err) {
        console.error("Request failed:", err);
        return null;
    }
}

module.exports = { searchMentions };
