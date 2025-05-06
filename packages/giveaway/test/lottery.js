const { Pool } = require('pg');
const pool = require('../../../config/dbconnect'); // Ensure this imports your existing DB connection

// Function to draw a lottery for a specific giveaway
async function drawLottery(giveawayId) {
  try {
    // Step 1: Retrieve all participants for the giveaway_id
    const participantsQuery = `
      SELECT * FROM public.participants
      WHERE giveaway_id = $1;
    `;
    const participantsResult = await pool.query(participantsQuery, [giveawayId]);
    
    if (participantsResult.rows.length === 0) {
      console.log('No participants found for this giveaway.');
      return;
    }

    // Step 2: Randomly select a winner
    const participants = participantsResult.rows;
    const winnerIndex = Math.floor(Math.random() * participants.length); // Random index
    const winner = participants[winnerIndex];

    console.log(`Winner for Giveaway ID ${giveawayId}:`);
    console.log(`  Username: ${winner.user_name}`);
    console.log(`  Tweet ID: ${winner.tweet_id}`);
    console.log(`  Participant ID: ${winner.participant_id}`);
    console.log(`  Drawn At: ${new Date().toLocaleString()}`);

    // Step 3: Optionally, update the giveaway status or participant status (e.g., mark as 'won' or flag giveaway as completed)
    // Update giveaway action performed flag
    const updateGiveawayQuery = `
      UPDATE public.giveaways
      SET action_performed = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE giveaway_id = $1;
    `;
    await pool.query(updateGiveawayQuery, [giveawayId]);

    console.log(`Giveaway ${giveawayId} marked as completed.`);
    
  } catch (error) {
    console.error('Error during lottery draw:', error);
  }
}

// Call the function to draw the lottery for giveaway_id 1
drawLottery(1);
