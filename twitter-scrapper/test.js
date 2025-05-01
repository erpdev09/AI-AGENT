// Simple script to test if environment variables are loading correctly
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Environment Variables Test:');
console.log('---------------------------');
console.log('TWITTER_USERNAME:', process.env.TWITTER_USERNAME ? 'Found ✅' : 'Not found ❌');
console.log('TWITTER_PASSWORD:', process.env.TWITTER_PASSWORD ? 'Found ✅' : 'Not found ❌');
console.log('TWITTER_SEARCH_QUERY:', process.env.TWITTER_SEARCH_QUERY ? 'Found ✅' : 'Not found ❌');
console.log('---------------------------');

// Show some debug information
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('---------------------------');