const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const login = require('../../twitter-scrapper/agent/login');
puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function attemptReply(page, replyText) {
    try {
   

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

        console.log("✅ Reply triggered.");
        await delay(2000);
    } catch (err) {
        console.error("❌ Failed to post reply:", err.message);
        const screenshotPath = path.join(__dirname, 'temp', 'reply_function_error.png');
        try {
            await page.screenshot({ path: screenshotPath });
            console.log(`Screenshot saved on error: ${screenshotPath}`);
        } catch (ssError) {
            console.error(`Screenshot failed: ${ssError.message}`);
        }
        throw err;
    }
}

async function replyToTweet(tweetId, replyMessage) {
    const browser = await puppeteer.launch({
        headless: 'new',
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

        const tweetUrl = `https://x.com/i/web/status/${tweetId}`;
        console.log(`Navigating to tweet: ${tweetUrl}`);
        await page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });
        await delay(3000);

        await attemptReply(page, replyMessage);
    } catch (err) {
        console.error("❌ Error in replyToTweet:", err.message);
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
}


module.exports = replyToTweet;