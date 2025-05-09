#!/usr/bin/env node

const replyToTweet = require('./replytotweet');

// Get command line arguments
const args = process.argv.slice(2);

// Function to display usage information
function showUsage() {
  console.log('\nUsage:');
  console.log('  node main.js <tweetId> <replyMessage>');
  console.log('\nExample:');
  console.log('  node main.js 1918355421263524119 "The txn has been processed and successful"');
  console.log('\nNote: If your reply message contains spaces, enclose it in quotes.\n');
  process.exit(1);
}

// Validate input
if (args.length < 2) {
  console.error('❌ Error: Insufficient arguments provided.');
  showUsage();
}

const tweetId = args[0];
// Join remaining arguments as the reply message in case it contains spaces
const replyMessage = args.slice(1).join(' ');

// Validate tweet ID format (basic validation)
if (!/^\d+$/.test(tweetId)) {
  console.error('❌ Error: Tweet ID should contain only numbers.');
  showUsage();
}

console.log(`Tweet ID: ${tweetId}`);
console.log(`Reply Message: ${replyMessage}`);
console.log('Starting reply process...');

// Call the replyToTweet function with the provided arguments
replyToTweet(tweetId, replyMessage);