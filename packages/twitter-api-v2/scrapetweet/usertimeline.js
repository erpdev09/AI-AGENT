const needle = require('needle');
const fs = require('fs');

const endpointUrl = "https://api.twitter.com/2/tweets/search/recent";
const bearerToken = ''; 

async function searchMentions() {
    const params = {
        "query": "from:Suhaimz11 @elisabethxbt",
        "max_results": 1, 
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
            return;
        }

        console.log("Tweets where @Suhaimz11 mentioned @elisabethxbt:");
        console.dir(response.body, { depth: null });

        // Save response to JSON file
        fs.writeFileSync('twitter_mentions.json', JSON.stringify(response.body, null, 2));
        console.log("Response saved to twitter_mentions.json");
    } catch (err) {
        console.error("Request failed:", err);
    }
}

searchMentions();
