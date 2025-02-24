const puppeteer = require('puppeteer');

async function login(page, username, password) {
    console.log("Opening Twitter login page...");
    await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

    console.log("Entering username...");
    await page.waitForSelector('input[name="text"]', { visible: true });
    await page.type('input[name="text"]', username);
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("Entering password...");
    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', password);
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("Logged in successfully");
}

module.exports = login;
