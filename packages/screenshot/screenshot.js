const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const login = require('../../twitter-scrapper/login'); // Adjust path if needed
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Adjust path if needed

const { createCanvas, loadImage } = require('canvas'); // For generating tweet image

// Load credentials from environment variables
const username = process.env.TWITTER_USERNAME;
const password = process.env.TWITTER_PASSWORD;

if (!username || !password) {
    console.error("❌ Error: Twitter username or password not found in environment variables. Check your .env file.");
    process.exit(1);
} else {
    console.log("✅ Environment variables loaded successfully.");
}

puppeteer.use(StealthPlugin());

(async () => {
    const tweetURL = 'https://twitter.com/jack/status/20'; // Change to target tweet URL
    const imagePath = 'tweet_image.png'; // Output path for image

    let browser = null;

    try {
        console.log("Launching browser...");
        browser = await puppeteer.launch({
            headless: "new", // Set to false if you want to debug
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        // Optional: Set a realistic User-Agent
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        );

        // Step 1: Login
        console.log("Attempting login...");
        await login(page, username, password); // Assuming login.js handles login

        // Step 2: Navigate to the tweet URL or thread
        console.log(`Navigating to: ${tweetURL}`);
        await page.goto(tweetURL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Step 3: Scrape the Original Tweet (Thread)
        const tweetSelector = 'article[data-testid="tweet"]:not([data-testid="retweet"])'; // Main tweet, excluding retweets
        console.log("Waiting for original tweet to appear...");
        await page.waitForSelector(tweetSelector, { timeout: 15000 });

        const tweetElement = await page.$(tweetSelector); // Get the main tweet element

        if (tweetElement) {
            const tweetData = await tweetElement.evaluate(tweetElement => {
                // Scrape tweet text
                const tweetText = tweetElement.querySelector('div[lang]') ? tweetElement.querySelector('div[lang]').innerText : '';

                // Scrape engagement stats (likes, retweets, comments) from class 'css-175oi2r'
                const engagementStats = tweetElement.querySelector('.css-175oi2r');
                let likes = '0', retweets = '0', comments = '0';

                if (engagementStats) {
                    // Scrape individual engagement stats within the class
                    const likeSpan = engagementStats.querySelector('div[data-testid="like"] span');
                    const retweetSpan = engagementStats.querySelector('div[data-testid="retweet"] span');
                    const commentSpan = engagementStats.querySelector('span.css-1jxf684');

                    likes = likeSpan ? likeSpan.innerText : '0';
                    retweets = retweetSpan ? retweetSpan.innerText : '0';
                    comments = commentSpan ? commentSpan.innerText : '0';
                }

                // Scrape user profile image
                const userImage = tweetElement.querySelector('img[src*="profile_images"]') ? tweetElement.querySelector('img[src*="profile_images"]').src : '';

                return {
                    tweetText,
                    likes,
                    retweets,
                    comments,
                    userImage
                };
            });

            // Log the scraped tweet data (optional)
            console.log("✅ Scraped tweet data:", tweetData);

            // Step 4: Generate image for the tweet
            const canvasWidth = 600;
            const canvasHeight = 400; // Adjusted height to accommodate image and text
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // Set background color and fonts
            ctx.fillStyle = '#f5f8fa'; // Twitter's background color
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Load the user's profile image
            if (tweetData.userImage) {
                const userImage = await loadImage(tweetData.userImage);
                ctx.drawImage(userImage, 10, 10, 50, 50); // Draw profile image
            }

            ctx.fillStyle = '#1da1f2'; // Twitter's blue for text
            ctx.font = 'bold 16px sans-serif';

            // Draw tweet text
            ctx.fillText(tweetData.tweetText, 70, 40, canvasWidth - 80);

            // Draw engagement stats (likes, retweets, comments)
            ctx.font = 'italic 14px sans-serif';
            ctx.fillText(`Likes: ${tweetData.likes} | Retweets: ${tweetData.retweets} | Comments: ${tweetData.comments}`, 10, 350);

            // Step 5: Save the image
            const fs = require('fs');
            const out = fs.createWriteStream(imagePath);
            const stream = canvas.createPNGStream();
            stream.pipe(out);
            out.on('finish', () => {
                console.log(`✅ Image saved as ${imagePath}`);
            });

        } else {
            console.error("❌ Could not find the original tweet.");
        }

    } catch (error) {
        console.error("❌ An error occurred during the process:");
        console.error(error.stack); // Log error details
    } finally {
        if (browser) {
            console.log("Closing browser...");
            await browser.close(); // Ensure to close the browser after screenshot
            console.log("Browser closed.");
        }
    }
})();
