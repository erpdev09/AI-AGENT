const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// ✅ Load character from JSON
const character = JSON.parse(fs.readFileSync('../pipeline/sentiment/character.json', 'utf8'));

// ✅ Initialize Gemini model
const genAI = new GoogleGenerativeAI('AIzaSyBqEWiMUW09KiJnAzdj273-l0xHg7vpPjs');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// 🔍 Main function: Check unread DMs and reply
async function checkAndScrapeUnreadDMs(page) {
  try {
    console.log("Navigating to X DMs...");
    await page.goto('https://x.com/messages', { waitUntil: 'networkidle2' });
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
            await page.waitForSelector('[data-testid="DmScrollerContainer"]', { timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 3000));

            const msgLoc = await page.$$('[data-testid="tweetText"]');
            const lastMessages = msgLoc.slice(-5);
            const conversationHistory = [];

            for (const msg of lastMessages) {
              const messageText = await msg.evaluate(el => el.textContent.trim());
              if (!messageText) continue;

              const parentHandle = await msg.evaluateHandle(el => el.parentElement);
              const backgroundColor = await parentHandle.evaluate(el => {
                return window.getComputedStyle(el).backgroundColor;
              });

              const sender = backgroundColor.includes('rgb(29, 155, 240)') ? 'You' : 'Them';
              conversationHistory.push({ sender, text: messageText });
            }

            const lastMessageFromThem = conversationHistory.slice().reverse().find(msg => msg.sender === 'Them');
            if (!lastMessageFromThem) {
              console.log("🤷 No message from Them in recent 5 to reply to.");
              await page.goBack();
              await new Promise(resolve => setTimeout(resolve, 5000));
              unreadCount = await countUnreadMessages();
              continue;
            }

            const aiReply = await generateAIReply(conversationHistory);
            console.log("🟢 AI Reply:", aiReply);

            await sendReply(page, aiReply);
            await new Promise(resolve => setTimeout(resolve, 2000));

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
  }
}

// 🤖 Generate AI reply with character traits from character.json
async function generateAIReply(conversationHistory) {
  try {
    const formattedHistory = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');

    const characterIntro = `
you’re ${character.name} — ${character.age}, ${character.style}. ${character.quirks}.

your tone is ${character.tone}. stay unexpected. stay smart.

reply to the last message from "them" in this dm conversation. keep it short — 30 to 40 words. make it hit.

${formattedHistory}

${character.name}'s reply:
    `;

    const replyResult = await model.generateContent(characterIntro);
    return replyResult.response.text().trim();
  } catch (error) {
    console.error("❌ Error generating reply:", error.message);
    return "glitched mid-thought. try again.";
  }
}

// ✍️ Send the AI-generated reply
async function sendReply(page, replyText) {
  try {
    await page.waitForSelector('[data-testid="dmComposerTextInput"]', { visible: true, timeout: 10000 });
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

module.exports = checkAndScrapeUnreadDMs;
