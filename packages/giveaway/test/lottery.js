const { Pool } = require('pg');
const pool = require('../../../config/dbconnect');
const axios = require('axios'); // For making HTTP requests to APIs

// Function to extract tweet ID from a tweet URL
function extractTweetId(tweetUrl) {
  // Extract the tweet ID from URLs like https://x.com/rilso_y/status/1234567890
  const parts = tweetUrl.split('/');
  return parts[parts.length - 1]; // Get the last part after the slash
}

// Function to send tokens to a winner
async function sendTokenToWinner(amount, recipient) {
  try {
    // Call the token transfer endpoint
    const response = await axios.get(`http://localhost:3000/direct/transfertoken/${amount}/${recipient}`);
    console.log(`Token transfer successful: ${amount} sent to ${recipient}`);
    return response.data;
  } catch (error) {
    console.error(`Error sending tokens to ${recipient}:`, error.message);
    throw error;
  }
}

// Function to send confirmation reply to the winner's tweet
async function sendTwitterConfirmation(tweetId, amount, tokenType) {
  try {
    const replyMessage = `Congratulations! You've won ${amount} ${tokenType} in our giveaway! The tokens have been transferred to your wallet.`;
    
    // Call the reply API endpoint
    const response = await axios.post('http://localhost:3000/api/replytospecifictweet', {
      tweetId: tweetId,
      replyMessage: replyMessage
    });
    
    console.log(`Tweet confirmation sent to tweet ID: ${tweetId}`);
    return response.data;
  } catch (error) {
    console.error(`Error sending tweet confirmation to ${tweetId}:`, error.message);
    throw error;
  }
}

// Function to draw a lottery for all giveaways with participants
async function drawAllGiveaways() {
  try {
    // Step 1: Retrieve all giveaways that are not marked as completed
    const giveawayQuery = `
      SELECT giveaway_id, participant_count, amount, token_type
      FROM public.giveaway
      WHERE action_performed = FALSE; -- Only fetch giveaways that are not completed
    `;
    const giveawayResult = await pool.query(giveawayQuery);
    
    if (giveawayResult.rows.length === 0) {
      console.log('No giveaways found or all giveaways are already completed.');
      return;
    }
    
    // Loop through all the giveaways
    for (const giveaway of giveawayResult.rows) {
      const giveawayId = giveaway.giveaway_id;
      const participantCount = giveaway.participant_count;
      const prizePool = giveaway.amount; // The total prize pool for this giveaway
      const tokenType = giveaway.token_type; // Retrieve token type from the giveaway table
      
      if (participantCount === 0) {
        console.log(`No participants count for Giveaway ID ${giveawayId}. Skipping.`);
        continue;
      }
      
      // Step 2: Retrieve all participants for this giveaway
      const participantsQuery = `
        SELECT * FROM public.participants
        WHERE giveaway_id = $1;
      `;
      const participantsResult = await pool.query(participantsQuery, [giveawayId]);
      
      if (participantsResult.rows.length === 0) {
        console.log(`No participants found for Giveaway ID ${giveawayId}.`);
        continue; // Skip this giveaway if no participants
      }
      
      // Step 3: Check if the number of participants is enough for the giveaway draw
      if (participantsResult.rows.length < participantCount) {
        console.log(`Not enough participants for Giveaway ID ${giveawayId}.`);
        continue;
      }
      
      const participants = participantsResult.rows;
      const winners = [];
      
      // Calculate the prize per winner
      const prizePerWinner = prizePool / participantCount;
      
      // Randomly select winners based on participant count
      for (let i = 0; i < participantCount; i++) {
        const winnerIndex = Math.floor(Math.random() * participants.length); // Random index
        const winner = participants.splice(winnerIndex, 1)[0]; // Remove the winner from the array to avoid duplicates
        
        winners.push(winner);
        
        // Log winner information
        console.log(`Winner for Giveaway ID ${giveawayId}:`);
        console.log(`  Username: ${winner.username}`);
        console.log(`  Solana Address: ${winner.solana_address}`);
        console.log(`  Prize Amount: ${prizePerWinner} ${tokenType}`);
        console.log(`  Tweet URL: ${winner.tweet_url}`);
        console.log('--------------------------');
        
        try {
          // Process token transfer for this winner
          await sendTokenToWinner(prizePerWinner, winner.solana_address);
          
          // Extract tweet ID from the tweet URL
          const tweetId = extractTweetId(winner.tweet_url);
          
          // Send confirmation reply to the winner's tweet
          await sendTwitterConfirmation(tweetId, prizePerWinner, tokenType);
          
          console.log(`Successfully processed winner: ${winner.username}`);
        } catch (error) {
          console.error(`Failed to process winner ${winner.username}:`, error.message);
          // Continue with other winners even if one fails
        }
      }
      
      // Step 4: Update the giveaway status to mark it as completed
      const updateGiveawayQuery = `
        UPDATE public.giveaway
        SET action_performed = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE giveaway_id = $1;
      `;
      await pool.query(updateGiveawayQuery, [giveawayId]);
      
      console.log(`Giveaway ${giveawayId} marked as completed.`);
    }
  } catch (error) {
    console.error('Error during lottery draw:', error);
  }
}

// Execute the function
drawAllGiveaways();