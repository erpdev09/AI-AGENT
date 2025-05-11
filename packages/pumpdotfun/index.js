const { Keypair, Connection } = require('@solana/web3.js');
const bs58 = require('bs58');

// Modifying the import path to require from the locally provided file
const { launchPumpFunToken } = require('./deploytoken');

const USER_PROVIDED_SECRET_KEY_BS58 = '';

let loadedWallet;
try {
  const secretKeyBytes = bs58.decode(USER_PROVIDED_SECRET_KEY_BS58);
  loadedWallet = Keypair.fromSecretKey(secretKeyBytes);
} catch (e) {
  console.error("FATAL ERROR: Failed to load wallet from the provided secret key.");
  console.error("Ensure the key is a valid Base58 encoded Solana private key.");
  console.error("Error details:", e);
  process.exit(1);
}

// Connection can be swapped to devnet if needed
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

const agent = {
  connection,
  wallet: loadedWallet,
  wallet_address: loadedWallet.publicKey,
};

// --- EXPORTABLE FUNCTION ---

async function deployToken({
  tokenName,
  tokenTicker,
  description,
  imageUrl,
  twitter,
  telegram,
  website,
  initialLiquiditySOL = 0.005,
  slippageBps = 50,
  priorityFee = 0.00005,
}) {
  const options = {
    twitter,
    telegram,
    website,
    initialLiquiditySOL,
    slippageBps,
    priorityFee,
  };

  console.log(`\n--- Launching Token: ${tokenName} (${tokenTicker}) ---`);
  console.log(`Wallet: ${agent.wallet_address.toBase58()}`);
  console.log(`Image URL: ${imageUrl}`); // We still log the source URL

  try {
    const result = await launchPumpFunToken(
      agent,
      tokenName,
      tokenTicker,
      description,
      imageUrl, // Pass the original image URL
      options
    );

    if (result.error) {
      console.error("Launch Failed:", result.error);
      return { success: false, error: result.error };
    }

    return {
      success: true,
      mint: result.mint,
      signature: result.signature,
      metadataUri: result.metadataUri,
    };
  } catch (err) {
    console.error("Unexpected Error:", err);
    return { success: false, error: err.message || err };
  }
}

module.exports = {
  deployToken,
};