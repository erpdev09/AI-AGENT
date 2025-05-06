const { Pool } = require('pg');
const pool = require('../../../config/dbconnect'); // Ensure this imports your existing DB connection

// Sample participants data
const participants = [
  {
    giveaway_id: 1,
    tweet_id: 1918895688986833371,
    user_name: "rilso_y"
  },
  {
    giveaway_id: 1,
    tweet_id: 1919456657974689801,
    user_name: "Mixopify"
  },
  {
    giveaway_id: 1,
    tweet_id: 1919457188268953830,
    user_name: "KeNDy81548"
  }
];

// Insert participants into the database
async function insertParticipants() {
  try {
    for (const participant of participants) {
      const { giveaway_id, tweet_id, user_name } = participant;
      
      const query = `
        INSERT INTO public.participants (giveaway_id, tweet_id, user_name)
        VALUES ($1, $2, $3)
        RETURNING participant_id, giveaway_id, tweet_id, user_name, created_at;
      `;
      
      const values = [giveaway_id, tweet_id, user_name];

      const res = await pool.query(query, values);
      console.log('Inserted Participant:', res.rows[0]);
    }
  } catch (error) {
    console.error('Error inserting participants:', error);
  }
}

// Call the function to insert participants
insertParticipants();
