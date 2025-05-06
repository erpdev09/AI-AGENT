require('dotenv').config();
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
// Ensure .env is correctly loaded. If your script is in the root, '../.env' might not be needed.
// If .env is in the same directory as the script, or the parent, adjust path.resolve if necessary.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Assumes .env is in parent directory
const login = require('../twitter-scrapper/agent/login'); // your existing login module
const fs = require('fs'); // For checking/creating 'temp' directory

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- attemptReply function (kept as it handles the reply posting) ---
async function attemptReply(page, replyText) {
    try {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log(`Created directory: ${tempDir}`);
        }

        console.log(`Waiting for reply textbox: 'div[role="textbox"][data-testid="tweetTextarea_0"]' to post: "${replyText}"`);
        await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { visible: true, timeout: 15000 });
        const replyBox = await page.$('div[role="textbox"][data-testid="tweetTextarea_0"]');
        
        if (!replyBox) {
            console.error("Reply textbox element not found after waiting.");
            await page.screenshot({ path: path.join(tempDir, 'reply_textbox_not_found_error.png') });
            throw new Error("Reply textbox element (tweetTextarea_0) not found.");
        }
        console.log("Reply textbox found. Focusing and typing...");
        
        await replyBox.click(); 
        await replyBox.focus();
        await page.keyboard.type(replyText, { delay: 50 });

        const platform = process.platform;
        console.log(`Detected platform: ${platform}. Preparing to send reply.`);

        if (platform === 'darwin') { // macOS
            await page.keyboard.down('Meta');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Meta');
            console.log(`Attempted to post reply using Cmd+Enter for Mac: '${replyText}'`);
        } else { // Windows/Linux
            await page.keyboard.down('Control');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Control');
            console.log(`Attempted to post reply using Ctrl+Enter for ${platform}: '${replyText}'`);
        }

        console.log("Waiting for network idle after attempting to post...");
        await page.waitForNetworkIdle({ timeout: 10000 });
        console.log(`✅ Successfully posted reply (or action submitted): '${replyText}'`);

    } catch (replyError) {
        console.error("❌ Failed to post reply using attemptReply function:", replyError.message);
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const screenshotPath = path.join(tempDir, 'reply_function_error.png');
        try {
            await page.screenshot({ path: screenshotPath });
            console.log(`Screenshot taken on error: ${screenshotPath}`);
        } catch (ssError) {
            console.error(`Failed to take screenshot: ${ssError.message}`);
        }
        throw replyError; 
    }
}
// --- End of attemptReply function ---

(async () => {
    const browser = await puppeteer.launch({
        headless: false, // Keep false for debugging, true for production
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;

    if (!username || !password) {
        console.error("❌ Twitter username or password not found in .env file.");
        if (browser) await browser.close();
        return;
    }

    try {
        await login(page, username, password);
        console.log("✅ Logged in successfully.");

        // --- Define the tweet you want to reply to ---
        const specificTweetUrl = 'https://x.com/Mixopify/status/1918355421263524119'; // Change this URL to the target tweet
        const replyMessage = "fouzan ladoo";
        
        console.log(`Navigating to specific tweet: ${specificTweetUrl}`);
        await page.goto(specificTweetUrl, { waitUntil: 'networkidle2' });
        await delay(3000); // Allow page to fully render and settle

        // --- Attempt to reply ---
        console.log(`Attempting to reply "${replyMessage}" to the tweet...`);
        await attemptReply(page, replyMessage); // Call the function with the new message

    } catch (err) {
        console.error('❌ Overall Error in main execution:', err.message);
        if (err.stack) {
            // console.error(err.stack); // Uncomment for full stack trace if needed
        }
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir) && page && !page.isClosed()) { // Check page also
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const screenshotPath = path.join(tempDir, 'main_execution_error.png');
        try {
            if (page && !page.isClosed()) {
                 // await page.screenshot({ path: screenshotPath });
                 // console.log(`Screenshot taken on main error: ${screenshotPath}`);
            }
        } catch (ssError) {
            console.error(`Failed to take screenshot on main error: ${ssError.message}`);
        }
    } finally {
        console.log("Processing finished. Closing browser...");
        if (browser) {
            await delay(2000); // Optional: keep browser open for a few seconds to see the result
            await browser.close();
        }
    }
})();