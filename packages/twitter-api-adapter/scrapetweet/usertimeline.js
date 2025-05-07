const needle = require('needle');
const fs = require('fs');
const pool = require('../../../config/dbconnect'); 

const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";
const bearerToken = '';

async function searchMentions() {
    const params = {
        "query": "(from:rilso_y) (@Elisabethxbt)",
        /* here we make sure it's update from higher level to update and then insert the data from
        frontend*/
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

        const formattedTweets = tweets.map(tweet => {
            const hasMention = tweet.text.includes('@');
            const username = 'rilso_y';
            const tweetLink = `https://x.com/${username}/status/${tweet.id}`;

            return {
                tweet_id: tweet.id,
                user_name: username,
                tweet_content: tweet.text,
                tweet_link: tweetLink,
                tweet_link_extra: tweetLink,
                is_replied_tweet: hasMention,
                is_direct_tag: false,
                created_at: new Date(tweet.created_at).toISOString(),
                updated_at: new Date().toISOString(),
                action_perform: false
            };
        });

        console.log("Formatted Tweets:");
        console.dir(formattedTweets, { depth: null });

        fs.writeFileSync('twitter_mentions.json', JSON.stringify(formattedTweets, null, 2));
        console.log("Response saved to twitter_mentions.json");

        for (const tweet of formattedTweets) {
            const { tweet_id } = tweet;

            const existsQuery = 'SELECT 1 FROM tweets1 WHERE tweet_id = $1';
            const existsResult = await pool.query(existsQuery, [tweet_id]);

            if (existsResult.rows.length > 0) {
                console.log(`⏩ Skipping duplicate tweet_id ${tweet_id}`);
                continue;
            }

            const insertQuery = `
                INSERT INTO tweets1 (
                    tweet_id, user_name, tweet_content, tweet_link, tweet_link_extra,
                    is_replied_tweet, is_direct_tag, created_at, updated_at, action_perform
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10
                )
            `;

            const values = [
                tweet_id,
                tweet.user_name,
                tweet.tweet_content,
                tweet.tweet_link,
                tweet.tweet_link_extra,
                tweet.is_replied_tweet,
                tweet.is_direct_tag,
                tweet.created_at,
                tweet.updated_at,
                tweet.action_perform
            ];

            await pool.query(insertQuery, values);
            console.log(`✅ Inserted tweet_id ${tweet_id}`);
        }

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
