const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { swap } = require('../packages/wallet/swaptoken/swap');

const { Connection, Keypair, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');
const spltokentransfer = require('../packages/wallet/transfertoken/soltoken'); // import the function

const app = express();
const PORT = process.env.PORT || 3000;

// Load sender SOL private key (for SOL transfers)
const senderKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
if (!senderKeyBase58) throw new Error('Missing SOLANA_PRIVATE_KEY in .env');

let sender;
try {
  const secretKey = bs58.decode(senderKeyBase58);
  sender = Keypair.fromSecretKey(secretKey);
  console.log("✅ Loaded sender:", sender.publicKey.toBase58());
} catch (err) {
  throw new Error('Invalid SOLANA_PRIVATE_KEY format. It must be a base58 string.');
}

// Connect to Solana Devnet
const connection = new Connection('https://api.devnet.solana.com');

// === SOL transfer route ===
app.get('/transfertoken/:amount/:recipient', async (req, res) => {
  const { amount, recipient } = req.params;

  try {
    const toPublicKey = new PublicKey(recipient);
    const amountSOL = parseFloat(amount);

    if (isNaN(amountSOL) || amountSOL <= 0) {
      const errorResponse = { error: 'Invalid amount' };
      console.log(errorResponse);
      return res.status(400).json(errorResponse);
    }

    const senderBalance = await connection.getBalance(sender.publicKey);
    const lamports = amountSOL * LAMPORTS_PER_SOL;

    if (senderBalance < lamports + 0.002 * LAMPORTS_PER_SOL) {
      const errorResponse = { error: 'Insufficient balance' };
      console.log(errorResponse);
      return res.status(400).json(errorResponse);
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );

    transaction.feePayer = sender.publicKey;

    const signature = await connection.sendTransaction(transaction, [sender]);

    const successResponse = {
      message: 'Transfer successful',
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };

    console.log(successResponse);
    res.json(successResponse);
  } catch (err) {
    console.error(err);
    const errorResponse = { error: 'Transfer failed', details: err.message };
    console.log(errorResponse);
    res.status(500).json(errorResponse);
  }
});

// === SPL Token transfer route ===
app.get('/api/sendspltoken/:contractaddress/:amount/:recipient', async (req, res) => {
  const { contractaddress, amount, recipient } = req.params;

  const privateKeyHex = process.env.SOLANA_PRIVATE_KEY; // should be stored securely
  if (!privateKeyHex) {
    return res.status(500).json({ error: 'PRIVATE_KEY is missing from .env' });
  }

  try {
    console.log(`⚙️  Initiating SPL Token Transfer`);
    await spltokentransfer(privateKeyHex, recipient, contractaddress, parseFloat(amount));
    const response = {
      message: 'SPL Token transfer initiated. Check logs for transaction status.',
    };
    console.log(response);
    res.json(response);
  } catch (err) {
    const errorResponse = { error: 'SPL token transfer failed', details: err.message };
    console.error(errorResponse);
    res.status(500).json(errorResponse);
  }
});

//Swap function code 


app.get('/swaptoken/:totoken/:foramount', async (req, res) => {
  const { totoken, foramount } = req.params;
  try {
    const txid = await swap({
      fromToken: "So11111111111111111111111111111111111111112", // SOL
      toToken: totoken,
      amount: parseFloat(foramount),
    });
    res.json({
      message: "Swap successful",
      txid,
      explorer: `https://solscan.io/tx/${txid}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Swap failed', details: err.message });
  }
});

// === Swap from any token to any token ===
app.get('/swaptoken/:from/:to/:amount', async (req, res) => {
  const { from, to, amount } = req.params;
  try {
    const txid = await swap({
      fromToken: from,
      toToken: to,
      amount: parseFloat(amount),
    });
    res.json({
      message: "Swap successful",
      txid,
      explorer: `https://solscan.io/tx/${txid}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Swap failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API listening at http://localhost:${PORT}`);
});
