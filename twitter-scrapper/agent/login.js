const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Logs into Twitter.
 * @param {import('puppeteer').Page} page - The Puppeteer page object.
 * @param {string} username - The Twitter username.
 * @param {string} password - The Twitter password.
 * @param {string} verificationEmail - The email address to use for verification if prompted.
 * @returns {Promise<boolean>} - True if login is successful, otherwise throws an error.
 */
module.exports = async function login(page, username, password, verificationEmail) {
  try {
    console.log("Opening Twitter login page...");
    await page.goto('https://twitter.com/login', {
      waitUntil: 'networkidle2', // Wait for network activity to be idle
      timeout: 60000 // 60 seconds timeout
    });

    // Type username
    console.log("Entering username...");
    // Wait for the username input field to be available
    await page.waitForSelector('input[name="text"]', { timeout: 20000 }); // 20 seconds timeout
    await page.type('input[name="text"]', username, { delay: 50 }); // Type with a small delay
    await page.keyboard.press('Enter'); // Press Enter to submit

    // Check for unusual verification step (phone or email)
    console.log("Checking for phone/email verification step...");
    try {
      // Selector for the phone/email verification input field
      const phoneOrEmailVerificationSelector = 'input[data-testid="ocfEnterTextTextInput"]';

      // Wait for the input field to be visible
      const hasPhoneOrEmailVerification = await page.waitForSelector(phoneOrEmailVerificationSelector, {
        timeout: 5000, // Adjusted timeout (7 seconds), can be tuned
        visible: true
      }).then(() => true).catch(() => false);

      if (hasPhoneOrEmailVerification) {
        console.log("Phone/email verification detected, entering verification detail...");
        if (!verificationEmail) {
          console.warn("Verification email not provided, but verification step was detected. This might cause an error.");
          // Optionally, throw an error here if verificationEmail is crucial
          // throw new Error("Verification email is required for this step but was not provided.");
        } else {
          // Type into the specific input field
          await page.type(phoneOrEmailVerificationSelector, verificationEmail, { delay: 50 });
          await page.keyboard.press('Enter');
          console.log("Phone/email verification submitted.");
        }
      } else {
        console.log("No phone/email verification step detected, or it timed out. Continuing...");
      }
    } catch (verifyError) {
      // Handle errors from waitForSelector or type operations within the verification try block
      console.log("No phone/email verification step detected or an error occurred in verification: ", verifyError.message);
      // Continue to the password stage as per the original logic
    }

    // Wait for password field to show up
    console.log("Waiting for password field...");
    // Increased timeout for password field appearance
    await page.waitForSelector('input[name="password"]', { timeout: 20000 }); // 20 seconds timeout

    // Type password
    console.log("Entering password...");
    await page.type('input[name="password"]', password, { delay: 50 });
    await page.keyboard.press('Enter');

    // Wait for home page to load
    console.log("Waiting for home feed to load...");
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }); // 60 seconds timeout

    const currentUrl = page.url();
    if (currentUrl.includes('/home')) {
      console.log("✅ Successfully logged into Twitter!");
      return true;
    } else {
      // Handle cases where login doesn't redirect to /home
      console.log(`Landed on ${currentUrl} instead of /home. Further verification might be needed or login failed.`);
      await page.screenshot({ path: 'login_redirect_error.png' }); // Save a screenshot for debugging
      throw new Error(`Login failed or redirected to an unexpected page: ${currentUrl}. Expected /home.`);
    }
  } catch (error) {
    console.error('❌ Error during login:', error.message);
    await page.screenshot({ path: 'login_error.png' }); // Save a screenshot on error
    throw error; // Re-throw the error to be handled by the caller
  }
};