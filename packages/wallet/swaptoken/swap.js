const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const { SolanaTracker } = require('solana-swap');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


async function swap({ fromToken, toToken, amount, slippage = 20, priorityFee = 0.00005 }) {
  const secretKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL;

  if (!secretKeyBase58) throw new Error("Missing SOLANA_PRIVATE_KEY in .env");
  if (!rpcUrl) throw new Error("Missing SOLANA_RPC_URL in .env");

  const keypair = Keypair.fromSecretKey(bs58.decode(secretKeyBase58));

  const solanaTracker = new SolanaTracker(
    keypair,
    rpcUrl
  );

  const swapResponse = await solanaTracker.getSwapInstructions(
    fromToken,
    toToken,
    amount,
    slippage,
    keypair.publicKey.toBase58(),
    priorityFee,
    {
      txVersion: 'V0'
    }
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
