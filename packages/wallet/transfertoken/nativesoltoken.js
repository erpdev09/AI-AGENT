const express = require('express');
const { Connection, Keypair, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');
require('dotenv').config(); // for storing private key in .env

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Solana devnet connection
const connection = new Connection('https://api.devnet.solana.com');

// Load sender's private key from env
const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
const sender = Keypair.fromSecretKey(secretKey);

app.get('/transfertoken/:amount/:recipient', async (req, res) => {
  try {
    const amountSOL = parseFloat(req.params.amount);
    const toPublicKeyStr = req.params.recipient;
    const toPublicKey = new PublicKey(toPublicKeyStr);

    if (isNaN(amountSOL) || amountSOL <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const balance = await connection.getBalance(sender.publicKey);
    const amountLamports = amountSOL * LAMPORTS_PER_SOL;

    if (balance < amountLamports + 0.002 * LAMPORTS_PER_SOL) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: toPublicKey,
        lamports: amountLamports,
      })
    );
    tx.feePayer = sender.publicKey;

    const txhash = await connection.sendTransaction(tx, [sender]);

    res.json({ message: 'Transfer successful', transactionHash: txhash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transfer failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
