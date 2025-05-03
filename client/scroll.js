

/*  This handle the scrolling on the feeds and liking the post randomly */
async function scrollTwitterFeed(page) {
    try {
      console.log("🕒 Waiting for home timeline to load...");
      // Navigate to the X homepage
      await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
      // Wait for 5 seconds to ensure the feed loads
      await new Promise(resolve => setTimeout(resolve, 5000));
      const scrollCount = 1; // Total number of scrolls
      let totalLikes = 0;
      let alreadyLiked = 0;



  
      for (let i = 0; i < scrollCount; i++) {
        console.log(`🌀 Scroll ${i + 1} of ${scrollCount}`);
        // Scroll down
        await page.evaluate(() => {
          window.scrollBy(0, 800);
        });
        // Wait for new tweets to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Get all like buttons currently visible
        const likeButtons = await page.$$('button[data-testid="like"]');
        console.log(`❤️ Found ${likeButtons.length} like buttons`);
  
        for (const likeButton of likeButtons) {
          try {
            // Check if it's really a Like button
            const isLikeButton = await page.evaluate(button => {
              return button.getAttribute('aria-label')?.includes('Like');
            }, likeButton);
  
            if (isLikeButton) {
              await likeButton.click();
              totalLikes++;
              console.log(`👍 Liked tweet #${totalLikes}`);
              await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500)); // Avoid rate limiting
            } else {
              alreadyLiked++;
              console.log("⏭️ Already liked, skipping");
            }
          } catch (error) {
            console.log("⚠️ Error trying to like a tweet:", error.message);
          }
        }
  
        // Wait randomly before next scroll
        const delay = Math.floor(Math.random() * 4000) + 8000; // 8-12 seconds
        console.log(`⏳ Waiting ${delay / 1000}s before next scroll...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
  
      console.log(`✅ Done scrolling. Liked: ${totalLikes}, Skipped: ${alreadyLiked}`);
    } catch (error) {
      console.error("❌ Error in scrollTwitterFeed:", error);
      await page.screenshot({ path: 'error_screenshot.png' });
    }
  }
  
  module.exports = scrollTwitterFeed;