const { TipLink } = require("@tiplink/api");
const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getMint,
} = require("@solana/spl-token");

const MINIMUM_SOL_BALANCE = 0.003 * LAMPORTS_PER_SOL;

/**
 * Create a TipLink and fund it with SOL or an SPL token.
 * 
 * @param {object} params
 * @param {Connection} params.connection - Solana RPC connection
 * @param {Keypair} params.payer - Keypair of the funding wallet
 * @param {number} params.amount - Amount to send
 * @param {PublicKey} [params.mintAddress] - Optional SPL token mint address
 * @returns {Promise<{ url: string, signature: string }>}
 */
async function createTipLinkWithFunds({ connection, payer, amount, mintAddress }) {
  try {
    const tiplink = await TipLink.create();

    if (!mintAddress) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: tiplink.keypair.publicKey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
      return { url: tiplink.url.toString(), signature };
    } else {
      const fromAta = await getAssociatedTokenAddress(mintAddress, payer.publicKey);
      const toAta = await getAssociatedTokenAddress(mintAddress, tiplink.keypair.publicKey);
      const mint = await getMint(connection, mintAddress);
      const adjustedAmount = amount * Math.pow(10, mint.decimals);

      const tx = new Transaction()
        .add(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }),
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: tiplink.keypair.publicKey,
            lamports: MINIMUM_SOL_BALANCE,
          }),
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            toAta,
            tiplink.keypair.publicKey,
            mintAddress
          ),
          createTransferInstruction(fromAta, toAta, payer.publicKey, adjustedAmount)
        );

      const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
      return { url: tiplink.url.toString(), signature };
    }
  } catch (err) {
    console.error("Error creating TipLink:", err);
    throw new Error("Failed to create TipLink: " + err.message);
  }
}

module.exports = { createTipLinkWithFunds };

