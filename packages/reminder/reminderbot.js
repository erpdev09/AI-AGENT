const express = require('express');
const bodyParser = require('body-parser');
const { getReminderTime } = require('./utils/helper');
const pool = require('../../config/dbconnect'); // Import pool from your dbconnect
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Initialize the Express app
const app = express();
const port = 5000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// API Route to Add Reminder
app.post('/api/addreminder/:duration', async (req, res) => {
  const { duration } = req.params;
  const { username, tweetid } = req.body;

  if (!username || !tweetid) {
    return res.status(400).json({ error: 'Missing username or tweetid' });
  }

  let remindTime;
  try {
    remindTime = getReminderTime(duration);  // Get UTC reminder time
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    await pool.query(
      'INSERT INTO remindme (username, remindmetime, tweetid) VALUES ($1, $2, $3)',
      [username, remindTime, tweetid]
    );

    return res.status(200).json({
      message: `Reminder set for @${username}`,
      remindTime,
    });
  } catch (err) {
    console.error('❌ Error inserting reminder:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});
// add a helper function to again fetch the db and check for something that has already
// converef like current vs old db data and do the neceassry
// like priorty the first that closed or nearst


// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
