const puppeteer = require('puppeteer');
const login = require('../twitter-scrapper/login'); // Import the login function

async function scrollTwitterFeed() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1280, height: 800 });
        
        // Your Twitter credentials - move these to environment variables or config file for security
        const TWITTER_USERNAME = 'Elisabethxbt';
        const TWITTER_PASSWORD = 'Takemyheart@1';
        
        // Login using the imported function
        await login(page, TWITTER_USERNAME, TWITTER_PASSWORD);
        
        // Wait for the home timeline to load
        console.log("Waiting for home timeline to load...");
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay
        
        // Scroll function with likes for all posts
        async function autoScroll(page) {
            const scrollCount = 10; // Number of scrolls
            let totalLikes = 0;
            let alreadyLiked = 0;
            
            for (let i = 0; i < scrollCount; i++) {
                console.log(`Scroll ${i + 1}/${scrollCount}`);
                
                // Scroll down
                await page.evaluate(() => {
                    window.scrollBy(0, 800); // Scroll by a specific amount
                });
                
                // Wait for tweets to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Find like buttons using the updated selector
                const likeButtons = await page.$$('button[data-testid="like"]');
                console.log(`Found ${likeButtons.length} like buttons on this scroll`);
                
                for (const likeButton of likeButtons) {
                    try {
                        // Check if we can find the "like" text in the button
                        const isLikeButton = await page.evaluate(button => {
                            return button.getAttribute('aria-label')?.includes('Like');
                        }, likeButton);
                        
                        if (isLikeButton) {
                            // Click the like button
                            await likeButton.click();
                            totalLikes++;
                            console.log(`Liked tweet #${totalLikes}`);
                            
                            // Small delay after each like to avoid being flagged
                            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
                        } else {
                            alreadyLiked++;
                            console.log("Tweet already liked, skipping");
                        }
                    } catch (error) {
                        console.log("Error liking a tweet:", error.message);
                    }
                }
                
                // Random delay between 8-12 seconds before next scroll
                const delay = Math.floor(Math.random() * 4000) + 8000; // 8000-12000ms
                console.log(`Waiting for ${delay/1000} seconds before next scroll...`);
                await new Promise(resolve => setTimeout(resolve, delay)); // Delay
            }
            
            console.log(`Finished scrolling. Liked ${totalLikes} tweets. ${alreadyLiked} were already liked.`);
        }
        
        console.log('Starting to scroll through feed and like all posts...');
        await autoScroll(page);
        
    } catch (error) {
        console.error('An error occurred:', error);
        await page.screenshot({ path: 'error_screenshot.png' });
    } finally {
        await browser.close();
    }
}

scrollTwitterFeed();
