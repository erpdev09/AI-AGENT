const puppeteer = require('puppeteer');
const login = require('../twitter-scrapper/login');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function checkAndScrapeUnreadDMs() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1280, height: 800 });

        const TWITTER_USERNAME = 'Elisabethxbt';
        const TWITTER_PASSWORD = 'Takemyheart@1';

        await login(page, TWITTER_USERNAME, TWITTER_PASSWORD);

        console.log("Navigating to Twitter DMs...");
        await page.goto('https://twitter.com/messages');
        await new Promise(resolve => setTimeout(resolve, 5000));

        async function countUnreadMessages() {
            return await page.evaluate(() => {
                return document.querySelectorAll('.css-175oi2r.r-sdzlij.r-lrvibr.r-615f2u.r-u8s1d.r-3sxh79.r-1xc7w19.r-1phboty.r-rs99b7.r-l5o3uw.r-1or9b2r.r-1lg5ma5.r-5soawk').length;
            });
        }

        let unreadCount = await countUnreadMessages();
        console.log(`Total unread messages: ${unreadCount}`);

        if (unreadCount === 0) {
            console.log('No unread messages found.');
            return;
        }

        while (unreadCount > 0) {
            const conversations = await page.$$('[data-testid="conversation"]');

            for (const conversation of conversations) {
                try {
                    const hasUnread = await conversation.$('.css-175oi2r.r-sdzlij.r-lrvibr.r-615f2u.r-u8s1d.r-3sxh79.r-1xc7w19.r-1phboty.r-rs99b7.r-l5o3uw.r-1or9b2r.r-1lg5ma5.r-5soawk');

                    if (hasUnread) {
                        console.log(`Opening unread conversation... (${unreadCount} left)`);
                        await conversation.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        await page.waitForSelector('[data-testid="DmScrollerContainer"]');

                        let lastMessageSize = 0;
                        const messages = new Set();

                        // Scroll down and collect messages
                        while (true) {
                            const msgLoc = await page.$$('[data-testid="tweetText"]');

                            for (const msg of msgLoc.reverse()) {
                                const messageText = await msg.evaluate(el => el.textContent.trim());

                                if (!messageText || messages.has(messageText)) continue;

                                // Determine sender based on background color
                                const parentHandle = await msg.evaluateHandle(el => el.parentElement);
                                const backgroundColor = await parentHandle.evaluate(el => {
                                    return window.getComputedStyle(el).backgroundColor;
                                });

                                const sender = backgroundColor.includes('rgb(29, 155, 240)') ? 'You' : 'Them';
                                messages.add(`${sender}: ${messageText}`);
                            }

                            if (messages.size === lastMessageSize) break; // Stop if no new messages appear
                            lastMessageSize = messages.size;

                            await page.keyboard.press('ArrowDown');
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }

                        console.log("🟡 Collected Messages:");
                        messages.forEach(msg => console.log(msg));

                        // Process each unread message
                        for (const msg of messages) {
                            if (msg.startsWith("Them: ")) {
                                const originalMessage = msg.replace("Them: ", "");
                                console.log("🟡 Unread Message:", originalMessage);

                                // Generate AI reply
                                const aiReply = await generateAIReply(originalMessage);
                                console.log("🟢 AI Generated Reply:", aiReply);

                                // Send AI reply
                                await sendReply(page, aiReply);

                                // Delay before processing the next message
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        }

                        // Go back to DM list
                        await page.goBack();
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Update unread count
                        unreadCount = await countUnreadMessages();
                        console.log(`Updated unread messages count: ${unreadCount}`);
                    }
                } catch (error) {
                    console.log("Error processing a conversation:", error.message);
                }
            }

            if (unreadCount === 0) {
                console.log("All unread messages have been processed.");
                break;
            }
        }

    } catch (error) {
        console.error('An error occurred:', error);
        await page.screenshot({ path: 'error_screenshot.png' });
    } finally {
        await browser.close();
    }
}

// Function to generate AI reply using Gemini API
async function generateAIReply(originalText) {
    try {
        const replyPrompt = `You are a casual Twitter user. Respond naturally to this message:
        Original message: '${originalText}'
        Reply as a normal user.`;

        const replyResult = await model.generateContent(replyPrompt);
        return replyResult.response.text();
    } catch (error) {
        console.error("❌ Error generating AI reply:", error.message);
        return "Sorry, I couldn't generate a reply.";
    }
}

// Function to send AI-generated reply
async function sendReply(page, replyText) {
    try {
        await page.waitForSelector('[data-testid="dmComposerTextInput"]', { visible: true });
        const inputBox = await page.$('[data-testid="dmComposerTextInput"]');

        if (inputBox) {
            await inputBox.type(replyText, { delay: 50 });
            await page.click('[data-testid="dmComposerSendButton"]');
            console.log("✅ Reply sent!");
        } else {
            console.log("❌ Could not find message input box.");
        }
    } catch (error) {
        console.error("❌ Error sending reply:", error.message);
    }
}

checkAndScrapeUnreadDMs();
