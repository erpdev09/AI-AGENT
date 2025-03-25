// solnativetransfer.js
const { Connection, Keypair, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

const connection = new Connection('https://api.devnet.solana.com');

async function solnativetransfer(feePayerSecretKey, aliceSecretKey, toPublicKeyStr, amountSOL) {
  const feePayer = Keypair.fromSecretKey(bs58.decode(feePayerSecretKey));
  const alice = Keypair.fromSecretKey(bs58.decode(aliceSecretKey));
  const toPublicKey = new PublicKey(toPublicKeyStr);

  const balance = await connection.getBalance(alice.publicKey);
  console.log(`Alice's balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  const amount = amountSOL * LAMPORTS_PER_SOL;

  if (balance < amount + 0.002 * LAMPORTS_PER_SOL) {
    console.log('Insufficient balance');
    return;
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: alice.publicKey,
      toPubkey: toPublicKey,
      lamports: amount,
    })
  );
  tx.feePayer = feePayer.publicKey;

  const txhash = await connection.sendTransaction(tx, [feePayer, alice]);
  console.log(`Transaction hash: ${txhash}`);
}

module.exports = { solnativetransfer };