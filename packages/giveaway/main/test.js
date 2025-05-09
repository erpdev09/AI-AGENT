
/*


Example to test tje extraction of keywords and determining a proper context from text/tweets
for extracting correct keywords and timeline
*/

// Include the required libraries
const nlp = require('compromise');
const chrono = require('chrono-node');

/**
 * Extracts giveaway details from tweet content
 * @param {string} tweetContent - The content of the tweet to analyze
 * @returns {Object} - Extracted giveaway details
 */
function extractGiveawayDetails(tweetContent) {
  // Check intent
  const isCreateGiveaway = /create a (giveaway|gw|campaign|contest|prize|draw)/i.test(tweetContent);

  // Extract number of participants
  let doc = nlp(tweetContent);
  let number = doc.numbers().values().map(n => n.number)[0];

  // Fallback regex
  if (!number) {
    const match = tweetContent.match(/(\d+)\s*(people|peep|guys|users|participants|members)?/i);
    if (match) number = parseInt(match[1]);
  }

  // Parse deadline
  const deadline = chrono.parseDate(tweetContent);

  // Extract amount and token type
  let amount;
  const tokenMatch = tweetContent.match(/([\d.]+)\s*(SOL|Solana|[1-9A-HJ-NP-Za-km-z]{32,}|USDC|usdc|bonk|Bonk|wif)/i);
  let tokenType = 'SOL'; // Default
  if (tokenMatch) {
    amount = parseFloat(tokenMatch[1]);
    tokenType = tokenMatch[2];
  }

  return { isCreateGiveaway, participantCount: number, amount, tokenType, deadline };
}

// Test with the provided example
const input = "Create a giveaway for 2 guys for 0.002 SOL that ends in 4min";
const result = extractGiveawayDetails(input);
console.log("Extraction Result:");
console.log(JSON.stringify(result, null, 2));

// Compare with the sample code provided
console.log("\nSample Code Result:");
const isCreateGiveaway = /create a (giveaway|gw)( campaign)?/i.test(input);

let doc = nlp(input);
let number = doc.numbers().values().map(n => n.number)[0];

// Fallback: extract number followed by participant-related keywords
if (!number) {
  const match = input.match(/(\d+)\s*(people|peep|guys|users|participants|members)?/i);
  if (match) number = parseInt(match[1]);
}

// Parse deadline with chrono-node
const deadline = chrono.parseDate(input);

// Extract amount before "SOL", "Solana", or a contract/address-like string
let amount;
const tokenMatch = input.match(/([\d.]+)\s*(SOL|Solana|[1-9A-HJ-NP-Za-km-z]{32,})/);
if (tokenMatch) {
  amount = parseFloat(tokenMatch[1]);
}

console.log({ isCreateGiveaway, number, amount, deadline });

// Additional test cases to show different scenarios
console.log("\nAdditional Test Cases:");
const testCases = [
  "Create a giveaway of 1.5 SOL for 10 people ending tomorrow",
  "I want to run a contest for 50 participants with 0.5 USDC prize that ends in 2 days",
  "Going to draw 3 winners for 5 bonk ending next Monday",
  "Create a giveaway campaign for 20 members with 1 Solana ending on May 15"
];

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: "${test}"`);
  console.log(JSON.stringify(extractGiveawayDetails(test), null, 2));
});