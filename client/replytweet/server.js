// server.js
const express = require('express');
const path = require('path');
// Load .env file from the project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Assuming replyToTweet.js is in the same directory as server.js
// If it's elsewhere, adjust the path: e.g., './scripts/replyToTweet'
const replyToTweet = require('./replytotweet');

const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default to 3000

// Middleware to parse JSON request bodies
app.use(express.json());
// Middleware to parse URL-encoded request bodies (e.g., from HTML forms)
app.use(express.urlencoded({ extended: true }));

/**
 * API Endpoint to reply to a tweet.
 *
 * Your proposed endpoint was: sendtweetviascrapper/{message}
 * This is problematic because:
 * 1. Tweet ID is missing: You need to know WHICH tweet to reply to.
 * 2. Passing the entire message in the URL path can be messy with special characters and spaces.
 *
 * A more RESTful approach:
 * Method: POST (because it creates a resource/performs an action)
 * Path: /api/tweet/reply/:tweetId  (tweetId as a path parameter)
 * Body: { "message": "Your reply message here" }
 *
 * Or, to pass both via body:
 * Path: /api/tweet/reply
 * Body: { "tweetId": "123...", "message": "Your reply message here" }
 *
 * Let's go with the latter for flexibility. If you stick to your original idea,
 * you'd need to pass tweetId some other way (e.g., query param or in body).
 */

// Endpoint: POST /api/replytospecifictweet
// Expects JSON body: { "tweetId": "...", "replyMessage": "..." }
app.post('/api/replytospecifictweet', async (req, res) => {
    const { tweetId, replyMessage } = req.body;

    console.log(`API call received: Reply to ${tweetId} with message: "${replyMessage}"`);

    if (!tweetId || typeof tweetId !== 'string' || !/^\d+$/.test(tweetId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid or missing tweetId. It must be a string of numbers.'
        });
    }

    if (!replyMessage || typeof replyMessage !== 'string' || replyMessage.trim() === '') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid or missing replyMessage. It must be a non-empty string.'
        });
    }

    try {
        // Call your puppeteer function
        // replyToTweet will handle its own console logging for the puppeteer process.
        // It will throw an error if something goes wrong internally, which we catch here.
        await replyToTweet(tweetId, replyMessage);

        // If replyToTweet completes without error, send a success response
        res.status(200).json({
            status: 'success',
            message: `Reply process initiated for tweet ${tweetId}. Check server logs for completion.`,
            tweetId: tweetId,
            sentMessage: replyMessage
        });
    } catch (error) {
        console.error('API Error: Failed to process reply request.', error.message);
        // Send an error response back to the client
        res.status(500).json({
            status: 'error',
            message: 'Failed to send reply due to an internal server error.',
            error: error.message, // Send back the error message from puppeteer script
            tweetId: tweetId
        });
    }
});


// If you wanted an endpoint closer to your original idea:
// POST /sendtweetviascrapper
// Body: { "tweetId": "actual_tweet_id", "message": "your message" }
app.post('/sendtweetviascrapper', async (req, res) => {
    // Note: your original path was /sendtweetviascrapper/{message}
    // This usually implies message is a path param. For longer messages, body is better.
    const { tweetId, message } = req.body; // Assuming you send tweetId in the body too

    console.log(`API call (sendtweetviascrapper) received: Reply to ${tweetId} with message: "${message}"`);


    if (!tweetId || typeof tweetId !== 'string' || !/^\d+$/.test(tweetId)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid or missing tweetId in request body. It must be a string of numbers.'
        });
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid or missing message in request body. It must be a non-empty string.'
        });
    }

    try {
        await replyToTweet(tweetId, message);
        res.status(200).json({
            status: 'success',
            message: `Reply process initiated for tweet ${tweetId} via /sendtweetviascrapper. Check server logs.`,
            tweetId: tweetId,
            sentMessage: message
        });
    } catch (error) {
        console.error('API Error (/sendtweetviascrapper): Failed to process reply request.', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send reply due to an internal server error via /sendtweetviascrapper.',
            error: error.message,
            tweetId: tweetId
        });
    }
});


// Basic root route for testing if the server is up
app.get('/', (req, res) => {
    res.send('Twitter Reply API Scrapper is running. Use POST /api/replytospecifictweet or POST /sendtweetviascrapper to send a reply.');
});

app.listen(port, () => {
    console.log(`Twitter Reply API server listening on http://localhost:${port}`);
    console.log(`Endpoints available:`);
    console.log(`  POST http://localhost:${port}/api/replytospecifictweet`);
    console.log(`  Body: { "tweetId": "YOUR_TWEET_ID", "replyMessage": "YOUR_REPLY_MESSAGE" }`);
    console.log(`  POST http://localhost:${port}/sendtweetviascrapper`);
    console.log(`  Body: { "tweetId": "YOUR_TWEET_ID", "message": "YOUR_REPLY_MESSAGE" }`);
});