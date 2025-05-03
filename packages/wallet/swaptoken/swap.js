// packages/wallet/swap/swap.js
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const { SolanaTracker } = require('solana-swap');
require('dotenv').config();

async function swap({ fromToken, toToken, amount, slippage = 20, priorityFee = 0.00005 }) {
  const secretKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
  if (!secretKeyBase58) throw new Error("Missing SOLANA_PRIVATE_KEY in .env");

  const keypair = Keypair.fromSecretKey(bs58.decode(secretKeyBase58));

  const solanaTracker = new SolanaTracker(
    keypair,
    "https://api.mainnet-beta.solana.com"
  );

  const swapResponse = await solanaTracker.getSwapInstructions(
    fromToken,
    toToken,
    amount,
    slippage,
    keypair.publicKey.toBase58(),
    priorityFee
  );

  console.log("Swap Response:", JSON.stringify(swapResponse, null, 2));

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

  return txid;
}

module.exports = { swap };
