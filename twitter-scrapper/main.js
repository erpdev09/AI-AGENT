const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[name="text"]');
    await page.type('input[name="text"]', 'Elisabe38130500');
    await page.keyboard.press('Enter');
    // Credentials are hardcoded for now test

    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', 'Takemyheart@1');
    await page.keyboard.press('Enter');

    await new Promise(resolve => setTimeout(resolve, 5000)); 
    
    console.log("Logged in successfully");
    
    // Keep browser open for testing purposes
    // await browser.close();
})();
