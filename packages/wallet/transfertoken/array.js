const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

// Replace with your actual private key string
const privateKeyBase58 = '';

// Decode base58 to Uint8Array
const secretKey = bs58.decode(privateKeyBase58);

// Convert to Keypair
const FROM_KEYPAIR = Keypair.fromSecretKey(secretKey);

// Log public key
console.log(`Public Key: ${FROM_KEYPAIR.publicKey.toString()}`);

// If you want to see it as an array of integers
console.log('Secret Key as integer array:', Array.from(secretKey));
