// File: reminderstart.js

// Adjust path to your database connection pool setup
const pool = require('../../config/dbconnect'); 

// Adjust path to the extractReminderTweetsModule.js file shown above
const extractReminderTweets = require('./utils/helper'); 

const axios = require('axios');

const REPLY_ENDPOINT_URL = 'http://localhost:3000/api/replytospecifictweet';
const REPLY_MESSAGE = 'u are remade';

// Intervals in milliseconds
const EXTRACT_TWEETS_INTERVAL_MS = 1 * 60 * 1000; 
const CHECK_REMINDERS_INTERVAL_MS = 1 * 60 * 1000; 

let extractIntervalId;
let checkIntervalId;

/**
 * Sends a reply notification to the specified tweet.
 * @param {string} tweetId - The ID of the tweet to reply to.
 * @param {string} replyMessage - The message content for the reply.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function sendReplyNotification(tweetId, replyMessage) {
  try {
    console.log(`Attempting to send reply to Tweet ID: ${tweetId}`);
    const response = await axios.post(REPLY_ENDPOINT_URL, {
      tweetId: tweetId,
      replyMessage: replyMessage,
    });
    console.log(`→ Reply sent successfully for Tweet ID: ${tweetId}. Status: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`→ Failed to send reply for Tweet ID ${tweetId}:`, error.response ? error.response.data : error.message);
    return false;
  }
}

/**
 * Checks for due reminders in the 'remindme' table and processes them.
 */
async function checkAndSendDueReminders() {
  console.log('Checking for due reminders...');
  const client = await pool.connect(); 
  try {
    const query = `
      SELECT id, tweetid, username, remindmetime
      FROM remindme
      WHERE remindmetime <= NOW() 
    `; 
    // For a more robust system, consider adding a 'processed' flag or similar
    // to avoid reprocessing indefinitely on temporary send failures.

    const { rows } = await client.query(query);

    if (rows.length === 0) {
      console.log('No due reminders found at this time.');
      return;
    }

    console.log(`Found ${rows.length} due reminders.`);

    for (const reminder of rows) {
      console.log(`Processing reminder for @${reminder.username} (Tweet ID: ${reminder.tweetid}) scheduled for ${reminder.remindmetime}`);

      const success = await sendReplyNotification(reminder.tweetid, REPLY_MESSAGE);

      if (success) {
        try {
          await client.query('DELETE FROM remindme WHERE id = $1', [reminder.id]);
          console.log(`→ Reminder for Tweet ID ${reminder.tweetid} (DB ID: ${reminder.id}) deleted successfully.`);
        } catch (deleteErr) {
          console.error(`→ Failed to delete reminder for Tweet ID ${reminder.tweetid} (DB ID: ${reminder.id}):`, deleteErr.message);
        }
      } else {
        console.log(`→ Reply for Tweet ID ${reminder.tweetid} failed. Reminder will be re-processed in the next check.`);
      }
    }
  } catch (err) {
    console.error('Error checking or processing reminders:', err.message);
  } finally {
    client.release(); // Release the client back to the pool
  }
}

/**
 * Main function to start the reminder service.
 */
async function startReminderService() {
  console.log('Reminder service starting...');

  console.log('Performing initial tweet extraction...');
  try {
    await extractReminderTweets(); // Ensure this doesn't call pool.end()
  } catch (err) {
    console.error('Initial tweet extraction failed:', err.message);
  }

  console.log('Performing initial check for due reminders...');
  await checkAndSendDueReminders();

  extractIntervalId = setInterval(async () => {
    console.log('Periodic tweet extraction triggered...');
    try {
      await extractReminderTweets();
    } catch (err) {
      console.error('Periodic tweet extraction failed:', err.message);
    }
  }, EXTRACT_TWEETS_INTERVAL_MS);

  checkIntervalId = setInterval(checkAndSendDueReminders, CHECK_REMINDERS_INTERVAL_MS);

  console.log(`Service started. Tweet extraction interval: ${EXTRACT_TWEETS_INTERVAL_MS / 1000}s. Reminder check interval: ${CHECK_REMINDERS_INTERVAL_MS / 1000}s.`);
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down reminder service...');
  clearInterval(extractIntervalId);
  clearInterval(checkIntervalId);

  try {
    await pool.end();
    console.log('Database pool has been closed.');
  } catch (err) {
    console.error('Error closing the database pool:', err.message);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown); 
process.on('SIGTERM', shutdown);

// Start the service
startReminderService().catch(err => {
  console.error("Failed to start reminder service:", err);
  if (err.message.includes("Cannot use a pool after calling end on the pool")) {
    console.error("This error often means 'extractReminderTweetsModule.js' is still calling 'pool.end()'. Please double-check it has been removed or commented out.");
  }
  process.exit(1);
});