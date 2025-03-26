const puppeteer = require('puppeteer');
const login = require('../twitter-scrapper/login');
const pool = require("../config/dbconnect");

async function checkTwitterDMs() {
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
        
        async function checkAndScrapeDMs(page) {
            console.log("Checking and scraping unread DMs...");
            await page.goto('https://twitter.com/messages');
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const conversations = await page.$$('[data-testid="conversation"]');
            const messages = [];
            
            console.log(`Found ${conversations.length} conversations`);
            
            for (const conversation of conversations) {
                try {
                    const hasUnread = await conversation.$('.css-175oi2r.r-sdzlij.r-lrvibr.r-615f2u.r-u8s1d.r-3sxh79.r-1xc7w19.r-1phboty.r-rs99b7.r-l5o3uw.r-1or9b2r.r-1lg5ma5.r-5soawk');
                    
                    console.log(`Conversation has unread indicator: ${!!hasUnread}`);
                    
                    if (hasUnread) {
                        await conversation.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        const conversationData = await page.evaluate(() => {
                            const usernameElement = document.querySelector('[data-testid="DMConversationTitle"] span');
                            const messageElements = document.querySelectorAll('[data-testid="tweetText"]');
                            
                            console.log('Username element found:', !!usernameElement);
                            console.log('Message elements found:', messageElements.length);
                            
                            if (!usernameElement) {
                                console.log('No username found in conversation');
                                return null;
                            }
                            
                            const username = usernameElement.textContent.trim();
                            const messageList = [];
                            
                            messageElements.forEach((msg, index) => {
                                const messageText = msg.textContent.trim();
                                console.log(`Message ${index + 1}: ${messageText || 'No text found'}`);
                                if (messageText) {
                                    messageList.push(messageText);
                                }
                            });
                            
                            return { username, messages: messageList };
                        });
                        
                        console.log('Conversation data:', conversationData);
                        
                        if (conversationData && conversationData.messages.length > 0) {
                            conversationData.messages.forEach(message => {
                                messages.push({
                                    username: conversationData.username,
                                    message: message
                                });
                            });
                            console.log(`Scraped ${conversationData.messages.length} messages from ${conversationData.username}`);
                        } else {
                            console.log('No messages scraped from this conversation');
                        }
                        
                        await page.goBack();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.log("Error processing a conversation:", error.message);
                }
            }
            
            for (const msg of messages) {
                try {
                    await pool.query(
                        'INSERT INTO messages (username, message) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [msg.username, msg.message]
                    );
                    console.log(`Stored message from ${msg.username} in database`);
                } catch (dbError) {
                    console.log('Database error:', dbError.message);
                }
            }
            
            console.log(`Processed and stored ${messages.length} unread messages`);
            return messages.length;
        }
        
        console.log('Starting to process unread DMs...');
        const unreadDMs = await checkAndScrapeDMs(page);
        if (unreadDMs > 0) {
            console.log(`Processed ${unreadDMs} unread DMs and stored in database`);
        } else {
            console.log('No unread messages found');
        }
        
    } catch (error) {
        console.error('An error occurred:', error);
        await page.screenshot({ path: 'error_screenshot.png' });
    } finally {
        await browser.close();
        await pool.end();
    }
}

checkTwitterDMs();