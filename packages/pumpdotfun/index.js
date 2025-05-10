// index.js
const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { launchPumpFunToken } = require('./deploytoken'); // Assumes deploytoken.js is in the same directory
const bs58 = require('bs58'); // For decoding the Base58 private key

// --- AGENT CONFIGURATION ---

// **SECURITY WARNING:** The private key below is hardcoded for this example.
// **NEVER do this in a production environment or with wallets holding real value.**
// Manage private keys securely, e.g., via environment variables.
const USER_PROVIDED_SECRET_KEY_BS58 = "";

let loadedWallet;
try {
  // Decode the Base58 private key string into a Uint8Array
  const secretKeyBytes = bs58.decode(USER_PROVIDED_SECRET_KEY_BS58);
  // Create a Keypair from the secret key bytes
  loadedWallet = Keypair.fromSecretKey(secretKeyBytes);
} catch (e) {
  console.error("FATAL ERROR: Failed to load wallet from the provided secret key.");
  console.error("Please ensure the secret key is a valid Base58 encoded Solana private key.");
  console.error("Error details:", e);
  process.exit(1); // Exit if the key is invalid, as the script cannot proceed
}

// For testing, consider using a Devnet RPC URL.
// Example Devnet RPC: ""
// For local testing (e.g., with Solana Test Validator):
// const connection = new Connection("http://127.0.0.1:8899", "confirmed");

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed"); // For Mainnet-Beta
// const connection = new Connection("https://api.devnet.solana.com", "confirmed"); // For Devnet (Recommended for testing with a new key)

const agent = {
  connection: connection,
  wallet: loadedWallet, // The Signer object (Keypair) loaded from your private key
  wallet_address: loadedWallet.publicKey, // The PublicKey corresponding to the loaded wallet
};

// --- TOKEN DETAILS ---
const tokenName = "My Token From PK"; // Example: "Awesome Coin"
const tokenTicker = "MTPK";          // Example: "AWC"
const description = "This is a sample token launched using a specific private key via Pump.fun!";

// --- IMPORTANT: IMAGE URL ---
// This MUST be a direct link to a publicly accessible PNG, JPG, or GIF image.
// Pump.fun (and the script) will try to fetch this image.
// Consider uploading your image to a service like Imgur (get the direct image link) or IPFS.
const imageUrl = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"; // Using SOL logo as a *valid* placeholder. Replace with your actual image.

const options = {
  twitter: "https://twitter.com/yourtokensprofilepk", // Optional
  telegram: "https://t.me/yourtokengrouppk",        // Optional
  website: "https://yourtokenwebsitepk.com",        // Optional
  initialLiquiditySOL: 0.005, // Amount of SOL for initial liquidity. Pump.fun has minimums. Ensure your wallet has this + fees.
  slippageBps: 50,          // Slippage in basis points (e.g., 50 for 0.5%).
  priorityFee: 0.00005,     // Solana priority fee in SOL.
};

(async () => {
  console.log(`--- Token Launch Script Initialized ---`);
  console.log(`Attempting to launch token using wallet: ${agent.wallet_address.toBase58()}`);
  console.log(`Using RPC endpoint: ${agent.connection.rpcEndpoint}`);
  console.warn("\n!!! SECURITY WARNING !!!");
  console.warn("This script is using a hardcoded private key.");
  console.warn("Ensure this is ONLY for testing with a wallet that does NOT hold significant value, especially if on Mainnet.");
  console.warn("The wallet associated with this private key MUST have sufficient SOL to cover initial liquidity and transaction fees.\n");
  console.log(`Using image URL: ${imageUrl} - Make sure this is a valid, public image link.`);


  try {
    // You might want to check the balance of the wallet first, especially on mainnet
    // const balance = await agent.connection.getBalance(agent.wallet_address);
    // console.log(`Wallet balance: ${balance / 1e9} SOL`); // 1e9 lamports = 1 SOL
    // if (balance < (options.initialLiquiditySOL * 1e9 + 5000000)) { // Rough check for liquidity + fees
    //    console.error(`Insufficient SOL balance. Wallet has ${balance / 1e9} SOL. Needs at least ~${options.initialLiquiditySOL + 0.005} SOL for liquidity and fees.`);
    //    return;
    // }

    const result = await launchPumpFunToken(
      agent,
      tokenName,
      tokenTicker,
      description,
      imageUrl,
      options
    );

    if (result.error) {
      console.error("\n--- Failed to launch token ---");
      console.error("Error Message:", result.error);
      if (result.error.includes("Transaction simulation failed") || result.error.includes("insufficient lamports") || (result.error.includes("Error Code: InsufficientFundsForRent"))) {
          console.error("This error often indicates the wallet does not have enough SOL to cover transaction fees, rent, and/or initial liquidity.");
          console.error("Please check the wallet balance and ensure it's funded adequately for the chosen network.");
      }
    } else {
      console.log("\n--- Token Launched Successfully (or transaction submitted) ---");
      console.log("Mint Address:", result.mint);
      console.log("Transaction Signature:", result.signature);
      console.log("Metadata URI:", result.metadataUri || "Not available");
      const explorerSuffix = agent.connection.rpcEndpoint.includes("devnet") ? "?cluster=devnet" : "";
      console.log(`\nView on Solscan: https://solscan.io/tx/${result.signature}${explorerSuffix}`);
      console.log(`View token on Solscan: https://solscan.io/token/${result.mint}${explorerSuffix}`);
    }

  } catch (error) {
    console.error("\n--- An unexpected error occurred during the launch process ---");
    console.error(error);
  }
})();