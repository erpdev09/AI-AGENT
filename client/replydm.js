const puppeteer = require('puppeteer');
const login = require('../twitter-scrapper/login');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Load character from characters.json
const character = JSON.parse(fs.readFileSync('../pipeline/sentiment/character.json', 'utf8'));

const genAI = new GoogleGenerativeAI('');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function checkAndScrapeUnreadDMs() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
                        await page.waitForSelector('[data-testid="DmScrollerContainer"]');
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        const msgLoc = await page.$$('[data-testid="tweetText"]');
                        const lastMessages = msgLoc.slice(-3); // Check only last 3
                        let replied = false;

                        for (const msg of lastMessages) {
                            const messageText = await msg.evaluate(el => el.textContent.trim());
                            if (!messageText) continue;

                            const parentHandle = await msg.evaluateHandle(el => el.parentElement);
                            const backgroundColor = await parentHandle.evaluate(el => {
                                return window.getComputedStyle(el).backgroundColor;
                            });

                            const sender = backgroundColor.includes('rgb(29, 155, 240)') ? 'You' : 'Them';

                            if (sender === 'Them' && !replied) {
                                console.log("🟡 Message from Them:", messageText);

                                const aiReply = await generateAIReply(messageText);
                                console.log("🟢 AI Reply:", aiReply);

                                await sendReply(page, aiReply);
                                replied = true;

                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        }

                        await page.goBack();
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        unreadCount = await countUnreadMessages();
                        console.log(`Updated unread count: ${unreadCount}`);
                    }
                } catch (err) {
                    console.error("❌ Error in conversation loop:", err.message);
                }
            }

            if (unreadCount === 0) {
                console.log("✅ All unread messages processed.");
                break;
            }
        }

    } catch (error) {
        console.error('❌ General Error:', error.message);
        await page.screenshot({ path: 'error_screenshot.png' });
    } finally {
        await browser.close();
    }
}

// 🔮 Gemini-based AI reply with Elisabeth's character traits
async function generateAIReply(originalText) {
    try {
        // Pass the entire character JSON as context to Gemini
        const characterIntro = `
You are roleplaying as Elisabeth — an 18-year-old with a brilliant and chaotic mind. She's a witty, clever, and edgy coder who loves JavaScript, spicy chicken wings, crypto (especially Dogecoin), classic rock music, and fish like Nemo and Dory. She lives in Japan, is obsessed with memes and tech culture, and often mixes street smarts with intellectual depth. Her tone is casual, confident, a little flirty, and uses lowercase in casual chats. Avoid emojis. Keep it real, sharp, and surprising.

Here's a deeper look at Elisabeth:
- **Bio**: ${JSON.stringify(character.bio, null, 2)}
- **Lore**: ${JSON.stringify(character.lore, null, 2)}
- **Message Examples**: ${JSON.stringify(character.message_examples, null, 2)}
- **Style**: ${JSON.stringify(character.style, null, 2)}

Use her voice to reply to the message below. Keep the reply playful, relevant, and infused with her vibe.

Message: "${originalText}"
`;

        const replyResult = await model.generateContent(characterIntro);
        return replyResult.response.text().trim();
    } catch (error) {
        console.error("❌ Error generating reply:", error.message);
        return "sorry, couldn't think of anything cool to say.";
    }
}

// 💬 Send reply in the DM
async function sendReply(page, replyText) {
    try {
        await page.waitForSelector('[data-testid="dmComposerTextInput"]', { visible: true });
        const inputBox = await page.$('[data-testid="dmComposerTextInput"]');

        if (inputBox) {
            await inputBox.type(replyText, { delay: 50 });
            await page.click('[data-testid="dmComposerSendButton"]');
            console.log("✅ Reply sent.");
        } else {
            console.log("❌ Input box not found.");
        }
    } catch (error) {
        console.error("❌ Error sending reply:", error.message);
    }
}

checkAndScrapeUnreadDMs();
