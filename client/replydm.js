const puppeteer = require('puppeteer');
const login = require('../twitter-scrapper/login');

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

                        let lastMessage = '';
                        const messages = new Set();
                        await page.waitForSelector('[data-testid="DmScrollerContainer"]');

                        // Scroll down and collect messages
                        while (true) {
                            const msgLoc = await page.$$('[data-testid="tweetText"]');

                            for (const msg of msgLoc.reverse()) {
                                const messageText = await msg.evaluate(el => el.textContent.trim());

                                if (!messageText || messages.has(messageText)) continue;

                                // Determine author based on background color
                                const parentHandle = await msg.evaluateHandle(el => el.parentElement);
                                const backgroundColor = await parentHandle.evaluate(el => {
                                    return window.getComputedStyle(el).backgroundColor;
                                });

                                const sender = backgroundColor.includes('rgb(29, 155, 240)') ? 'You' : 'Them';
                                messages.add(`${sender}: ${messageText}`);
                            }

                            if (messages.size === lastMessage) break; // Stop if no new messages appear
                            lastMessage = messages.size;

                            await page.keyboard.press('ArrowDown');
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }

                        console.log("Collected messages:");
                        messages.forEach(msg => console.log(msg));

                        await page.goBack();
                        await new Promise(resolve => setTimeout(resolve, 2000));

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

checkAndScrapeUnreadDMs();
