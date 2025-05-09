// File: extractReminderTweetsModule.js (or your chosen filename)

// (Adjust the path to dbconnect.js as per your project structure,
// this path is taken from your provided code)
const pool = require('../../../config/dbconnect');
const chrono = require('chrono-node');

// Function to extract and insert reminders
async function extractReminderTweets() {
  const query = `
    SELECT tweet_id, user_name, tweet_content, action_perform
    FROM tweets1
    WHERE LOWER(tweet_content) LIKE '%remind me%'
       OR LOWER(tweet_content) LIKE '%remind%'
  `;

  try {
    // For a function that is part of a larger application using a shared pool,
    // it's generally better practice to acquire a client from the pool
    // for the duration of the function's operations and then release it.
    // Example:
    // const client = await pool.connect();
    // try {
    //   const { rows } = await client.query(query);
    //   // ... perform other operations with client.query ...
    // } finally {
    //   client.release(); // Release the client back to the pool
    // }
    //
    // However, to keep changes minimal to your original structure for now,
    // we'll continue using pool.query directly but ensure pool.end() is not called.

    const { rows } = await pool.query(query); // Using the pool directly for the query

    if (rows.length === 0) {
      console.log('No tweets found with reminder keywords.');
      return;
    }

    console.log(`Found ${rows.length} tweets:`);

    for (const row of rows) {
      const { tweet_id, user_name, tweet_content, action_perform } = row;

      // Skip if action_perform is already true
      if (action_perform) {
        console.log(`→ Action already performed for Tweet ID: ${tweet_id}. Skipping.`);
        continue;
      }

      const parsedDate = chrono.parseDate(tweet_content);

      console.log(`[Tweet ID: ${tweet_id}] @${user_name}: ${tweet_content}`);

      if (parsedDate) {
        console.log(`→ Parsed reminder time: ${parsedDate.toISOString()}`);

        // Try inserting into remindme
        try {
          // Insert into the remindme table
          await pool.query(
            `INSERT INTO remindme (id, username, remindmetime, tweetid)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`, // prevents duplicates if already inserted
            [parseInt(tweet_id), user_name, parsedDate, tweet_id]
          );
          console.log('→ Reminder inserted into \`remindme\` table.');

          // Update actionperform to true in tweets1 after successful insert
          await pool.query(
            `UPDATE tweets1
             SET action_perform = true
             WHERE tweet_id = $1`,
            [tweet_id]
          );
          console.log(`→ actionperform set to true for Tweet ID: ${tweet_id}`);
          
        } catch (insertErr) {
          console.error(`→ Failed to insert reminder for Tweet ID ${tweet_id}:`, insertErr.message);
        }
      } else {
        console.log('→ No valid reminder time detected.');
      }
    }

  } catch (err) {
    console.error('Error processing tweets:', err);
    // If this function were using a client from pool.connect(),
    // you'd ensure client.release() is called here in case of an error
    // before pool.query if pool.connect() was successful.
  } finally {
    // await pool.end(); // <--- THIS IS THE IMPORTANT UPDATE
                       // This line is now commented out.
                       // The main application (reminderstart.js) will handle closing the pool
                       // when the entire service shuts down.
                       // If this function were managing its own client (client = await pool.connect()),
                       // you would put client.release() here.
  }
}

// Export the function so it can be imported elsewhere
module.exports = extractReminderTweets;