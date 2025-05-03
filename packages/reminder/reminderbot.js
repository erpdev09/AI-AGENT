const dayjs = require('dayjs');
const pool = require('../../config/dbconnect');

async function checkReminders() {
  const now = dayjs().toISOString();
  const query = `
    SELECT * FROM remindme 
    WHERE remindmetime <= $1 AND reminded = false
  `;

  try {
    const { rows } = await pool.query(query, [now]);

    for (const row of rows) {
      console.log(`@${row.username} Reminder for tweet ${row.tweetid} 🔔`);

      await pool.query(
        'UPDATE remindme SET reminded = true WHERE id = $1',
        [row.id]
      );
    }
  } catch (err) {
    console.error('❌ Error checking reminders:', err);
  }
}

function start() {
  console.log('🔔 Reminder service started...');
  setInterval(checkReminders, 30 * 1000);
}

start();
