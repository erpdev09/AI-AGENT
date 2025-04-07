const axios = require('axios');
const puppeteer = require('puppeteer');
const login = require('../twitter-scrapper/login'); 

// Fetch the latest boosted tokens from Dexscreener
async function fetchBoostedTokens() {
    const url = 'https://api.dexscreener.com/token-boosts/top/v1';
    try {
        const response = await axios.get(url);
        return response.data; // This will contain the boosted tokens' details
    } catch (error) {
        console.error('Error fetching boosted tokens:', error);
        return [];
    }
}

// Fetch token pools using the token address
async function fetchTokenPools(chainId, tokenAddress) {
    const url = `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`;
    try {
        const response = await axios.get(url);
        
        // Check if pools are available for the given token
        if (response.data && response.data.length > 0) {
            return response.data[0]; // Return the first pool's data
        } else {
            console.error(`No pools found for token ${tokenAddress}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching token pools:', error);
        return null;
    }
}

// Search for meme coins on Twitter (No likes functionality)
async function searchMemeCoinsOnTwitter(memeCoins) {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1280, height: 800 });

        // Your Twitter credentials
        const TWITTER_USERNAME = 'Elisabethxbt';
        const TWITTER_PASSWORD = 'Takemyheart@1';

        // Login using the imported function
        await login(page, TWITTER_USERNAME, TWITTER_PASSWORD);

        // Loop through meme coins and search for them on Twitter
        for (const coin of memeCoins) {
            const searchTerm = coin.tokenAddress; // e.g., "Dogecoin" or "Shiba Inu"
            await page.goto(`https://twitter.com/search?q=${encodeURIComponent(searchTerm)}&src=typed_query`);

            console.log(`Searching for tweets related to ${searchTerm}...`);

            // Wait for tweets to load
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds

            // Scroll and find tweets (No likes functionality)
            await autoScrollTweets(page, searchTerm);
        }

    } catch (error) {
        console.error("An error occurred while searching Twitter:", error);
    } finally {
        await browser.close();
    }
}

// Function to auto-scroll through tweets
async function autoScrollTweets(page, searchTerm) {
    let totalTweets = 0;

    const scrollCount = 5; // Number of scrolls
    for (let i = 0; i < scrollCount; i++) {
        console.log(`Scroll ${i + 1}/${scrollCount} for ${searchTerm}`);

        // Scroll down
        await page.evaluate(() => {
            window.scrollBy(0, 800); // Scroll by a specific amount
        });

        // Wait for tweets to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find tweets
        const tweets = await page.$$('div[role="article"]');
        console.log(`Found ${tweets.length} tweets on this scroll`);

        // Count tweets (or you can add further tweet analysis)
        totalTweets += tweets.length;

        // Random delay between 8-12 seconds before next scroll
        const delay = Math.floor(Math.random() * 4000) + 8000; // 8000-12000ms
        console.log(`Waiting for ${delay / 1000} seconds before next scroll...`);
        await new Promise(resolve => setTimeout(resolve, delay)); // Delay
    }

    console.log(`Finished scrolling and found ${totalTweets} tweets for ${searchTerm}.`);
}

// Automate the entire meme coin trading process
async function automateMemeCoinTrading() {
    // Fetch trending meme coins from Dexscreener
    const boostedTokens = await fetchBoostedTokens();
    if (boostedTokens.length === 0) {
        console.log("No boosted tokens found.");
        return;
    }

    // Filter for meme coins by checking if the description exists and includes 'meme'
    const memeCoins = boostedTokens.filter(token => {
        // Check if description exists and is a string
        return token.description && typeof token.description === 'string' && token.description.includes('meme');
    });

    // Fetch token pools data for each meme coin
    for (const coin of memeCoins) {
        const poolData = await fetchTokenPools(coin.chainId, coin.tokenAddress);
        if (poolData) {
            console.log(`Token: ${coin.tokenAddress}`);
            console.log(`Price: ${poolData.priceUsd}`);
            console.log(`Volume: ${poolData.volume ? poolData.volume.base : 'N/A'}`); // Check if volume exists
            // Check if liquidity exists and log it, otherwise show 'N/A'
            console.log(`Liquidity: ${poolData.liquidity && poolData.liquidity.usd ? poolData.liquidity.usd : 'N/A'}`);
            // Add additional checks or filters here to identify good tokens
        }
    }

    // Search Twitter for meme coins mentions and engage
    await searchMemeCoinsOnTwitter(memeCoins);
}

// Run the automation
automateMemeCoinTrading();
