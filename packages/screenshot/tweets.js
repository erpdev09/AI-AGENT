const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const login = require('../../twitter-scrapper/login'); // Adjust path if needed
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

// Load credentials
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
    const tweetURL = 'https://twitter.com/jack/status/20'; // Replace with target tweet
    const imagePath = 'tweet_image.png';

    let browser = null;

    try {
        console.log("Launching browser...");
        browser = await puppeteer.launch({
            headless: "new", // Set to false for debugging
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        );

        // Step 1: Login
        console.log("Attempting login...");
        await login(page, username, password);

        // Step 2: Navigate to the tweet URL
        console.log(`Navigating to: ${tweetURL}`);
        await page.goto(tweetURL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Step 3: Wait for tweet
        const tweetSelector = 'article[data-testid="tweet"]:not([data-testid="retweet"])';
        console.log("Waiting for original tweet to appear...");
        await page.waitForSelector(tweetSelector, { timeout: 15000 });

        const tweetElement = await page.$(tweetSelector);

        if (tweetElement) {
            const tweetData = await tweetElement.evaluate(tweetElement => {
                const tweetText = tweetElement.querySelector('div[lang]')?.innerText || '';

                let likes = '0', retweets = '0', comments = '0', bookmarks = '0';
                const engagementBlock = tweetElement.querySelector('[aria-label*="like"]')?.innerText || '';
                const parts = engagementBlock.split('\n');

                if (parts.length >= 4) {
                    [likes, retweets, comments, bookmarks] = parts;
                }

                const userImage = tweetElement.querySelector('img[src*="profile_images"]')?.src || '';

                return {
                    tweetText,
                    likes,
                    retweets,
                    comments,
                    bookmarks,
                    userImage
                };
            });

            console.log("✅ Scraped tweet data:", tweetData);

            // Step 4: Generate tweet image
            const canvasWidth = 600;
            const canvasHeight = 400;
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#f5f8fa';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Draw profile image
            if (tweetData.userImage) {
                const userImage = await loadImage(tweetData.userImage);
                ctx.drawImage(userImage, 10, 10, 50, 50);
            }

            ctx.fillStyle = '#1da1f2';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(tweetData.tweetText, 70, 40, canvasWidth - 80);

            // Draw engagement stats
            ctx.font = 'italic 14px sans-serif';
            ctx.fillText(
                `Likes: ${tweetData.likes} | Retweets: ${tweetData.retweets} | Comments: ${tweetData.comments} | Bookmarks: ${tweetData.bookmarks}`,
                10,
                350
            );

            // Step 5: Save image
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
        console.error("❌ An error occurred:");
        console.error(error.stack);
    } finally {
        if (browser) {
            console.log("Closing browser...");
            await browser.close();
            console.log("Browser closed.");
        }
    }
})();
