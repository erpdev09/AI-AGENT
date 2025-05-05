const nlp = require('compromise');
const chrono = require('chrono-node');

const input = "Create a giveaway for 2 guys for 0.002 SOL that ends in 4min";

// Check intent
const isCreateGiveaway = /create a (giveaway|gw)( campaign)?/i.test(input);

// Extract number of participants
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
