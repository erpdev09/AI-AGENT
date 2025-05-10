const { Keypair } = require("@solana/web3.js");

// Load secret key
const secretKey = Uint8Array.from([
  
]);
const keypair = Keypair.fromSecretKey(secretKey);

// Output public key
console.log("Public Key:", keypair.publicKey.toBase58());