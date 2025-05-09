/* 
This is just a example not used in prod
*/
require('dotenv').config();
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const login = require('../twitter-scrapper/agent/login');
const fs = require('fs');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function attemptReply(page, replyText) {
    try {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        console.log(`Waiting for reply textbox to post: "${replyText}"`);
        await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { visible: true, timeout: 15000 });
        const replyBox = await page.$('div[role="textbox"][data-testid="tweetTextarea_0"]');

        if (!replyBox) throw new Error("Reply textbox not found.");

        await replyBox.click(); 
        await replyBox.focus();
        await page.keyboard.type(replyText, { delay: 50 });

        const platform = process.platform;
        if (platform === 'darwin') {
            await page.keyboard.down('Meta');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Meta');
        } else {
            await page.keyboard.down('Control');
            await page.keyboard.press('Enter');
            await page.keyboard.up('Control');
        }

        console.log("✅ Reply triggered. Waiting 1 second before closing browser...");
        await delay(2000);

    } catch (replyError) {
        console.error("❌ Failed to post reply:", replyError.message);
        const screenshotPath = path.join(__dirname, 'temp', 'reply_function_error.png');
        try {
            await page.screenshot({ path: screenshotPath });
            console.log(`Screenshot saved on error: ${screenshotPath}`);
        } catch (ssError) {
            console.error(`Screenshot failed: ${ssError.message}`);
        }
        throw replyError;
    }
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;

    if (!username || !password) {
        console.error("❌ Twitter credentials missing in .env");
        await browser.close();
        return;
    }

    try {
        await login(page, username, password);
        console.log("✅ Logged in successfully.");

        const specificTweetUrl = 'https://x.com/Mixopify/status/1918355421263524119';
        const replyMessage = "The txn has been processed and succesfull";

        console.log(`Navigating to tweet: ${specificTweetUrl}`);
        await page.goto(specificTweetUrl, { waitUntil: 'domcontentloaded' });
        await delay(3000);

        await attemptReply(page, replyMessage);

    } catch (err) {
        console.error('❌ Error:', err.message);
        const screenshotPath = path.join(__dirname, 'temp', 'main_error.png');
        try {
            if (page && !page.isClosed()) {
                await page.screenshot({ path: screenshotPath });
                console.log("Screenshot saved from main error.");
            }
        } catch (ssError) {
            console.error(`Screenshot on error failed: ${ssError.message}`);
        }
    } finally {
        console.log("✅ Done. Closing browser.");
        await delay(1000);
        await browser.close();
    }
})();
