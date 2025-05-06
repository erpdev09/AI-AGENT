const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

module.exports = async function login(page, username, password) {
  try {
    console.log("Opening Twitter login page...");
    await page.goto('https://twitter.com/login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Type username
    console.log("Entering username...");
    await page.waitForSelector('input[name="text"]', { timeout: 20000 });
    await page.type('input[name="text"]', username, { delay: 50 });
    await page.keyboard.press('Enter');

    // Wait for password field to show up
    console.log("Waiting for password field...");
    await page.waitForSelector('input[name="password"]', { timeout: 20000 });

    // Type password
    console.log("Entering password...");
    await page.type('input[name="password"]', password, { delay: 50 });
    await page.keyboard.press('Enter');

    // Wait for home page to load
    console.log("Waiting for home feed to load...");
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

    const currentUrl = page.url();
    if (currentUrl.includes('/home')) {
      console.log("✅ Successfully logged into Twitter!");
    } else {
      throw new Error('Login failed or redirected to unexpected page.');
    }
  } catch (error) {
    console.error('❌ Error during login:', error.message);
    await page.screenshot({ path: 'login_error.png' });
    throw error;
  }
};
