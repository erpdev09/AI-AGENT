const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const { SolanaTracker } = require('solana-swap');

async function swap() {
  // Initialize wallet
  const keypair = Keypair.fromSecretKey(
    bs58.decode("")
  );

  // Create instance with RPC endpoint
  const solanaTracker = new SolanaTracker(
    keypair,
    "https://api.mainnet-beta.solana.com"
  );

  // Get swap instructions
  const swapResponse = await solanaTracker.getSwapInstructions(
    "So11111111111111111111111111111111111111112", // From Token (SOL)
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // To Token (USDC)
    0.00001,                                       // Amount to swap
    20,                                            // Slippage (%)
    keypair.publicKey.toBase58(),                 // Payer public key
    0.00005                                        // Priority fee
  );

  // Log swap response
  console.log("Swap Response:", JSON.stringify(swapResponse, null, 2));

  // Execute the swap
  try {
    const txid = await solanaTracker.performSwap(swapResponse, {
      sendOptions: { skipPreflight: true },
      confirmationRetries: 30,
      confirmationRetryTimeout: 500,
      lastValidBlockHeightBuffer: 150,
      resendInterval: 1000,
      confirmationCheckInterval: 1000,
      commitment: "processed",
      skipConfirmationCheck: false
    });

    console.log("Transaction ID:", txid);
    console.log("Transaction URL:", `https://solscan.io/tx/${txid}`);
  } catch (error) {
    const { signature, message } = error;
    console.error("Error performing swap:", message, signature);
  }
}

swap();
