const {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction
} = require('@solana/web3.js');
const {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction
} = require('@solana/spl-token');
const bs58 = require('bs58');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
/**
 * Transfers tokens on the Solana blockchain.
 * @param {string} base58PrivateKey - The private key in base58 format.
 * @param {string} destinationWallet - The recipient's wallet address.
 * @param {string} mintAddress - The mint address of the token.
 * @param {number} transferAmount - The amount of tokens to transfer.
 */
async function spltokentransfer(base58PrivateKey, destinationWallet, mintAddress, transferAmount) {
    const secretKey = bs58.decode(base58PrivateKey);
    const FROM_KEYPAIR = Keypair.fromSecretKey(secretKey);

    const QUICKNODE_RPC =  process.env.SOLANA_RPC_URL;
    const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC, 'confirmed');

    async function getNumberDecimals(mintAddress) {
        const info = await SOLANA_CONNECTION.getParsedAccountInfo(new PublicKey(mintAddress));
        return info.value?.data.parsed.info.decimals;
    }

    console.log(`Sending ${transferAmount} tokens from ${FROM_KEYPAIR.publicKey.toString()} to ${destinationWallet}.`);

    const mintPubkey = new PublicKey(mintAddress);
    const fromPubkey = FROM_KEYPAIR.publicKey;
    const toPubkey = new PublicKey(destinationWallet);

    console.log(`1 - Getting Source Token Account`);
    const sourceAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        FROM_KEYPAIR,
        mintPubkey,
        fromPubkey
    );
    console.log(`    Source Account: ${sourceAccount.address.toString()}`);

    console.log(`2 - Getting Destination Token Account`);
    const destinationAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        FROM_KEYPAIR,
        mintPubkey,
        toPubkey
    );
    console.log(`    Destination Account: ${destinationAccount.address.toString()}`);

    console.log(`3 - Fetching Number of Decimals for Mint: ${mintAddress}`);
    const numberDecimals = await getNumberDecimals(mintAddress);
    console.log(`    Number of Decimals: ${numberDecimals}`);

    console.log(`4 - Creating and Sending Transaction`);

    // Create transaction
    const tx = new Transaction().add(
        createTransferInstruction(
            sourceAccount.address,
            destinationAccount.address,
            fromPubkey,
            transferAmount * Math.pow(10, numberDecimals)
        )
    );

    // Get fresh blockhash and set it to the transaction
    const { blockhash } = await SOLANA_CONNECTION.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = fromPubkey;

    // Retry the transaction in case the first attempt fails
    try {
        const signature = await sendAndConfirmTransaction(SOLANA_CONNECTION, tx, [FROM_KEYPAIR]);
        console.log(
            '\x1b[32m',
            `   Transaction Success!🎉`,
            `\n     https://explorer.solana.com/tx/${signature}?cluster=mainnet`
        );
    } catch (error) {
        console.error('\x1b[31m', `   Transaction Failed: ${error.message}`);
    }
}

module.exports = spltokentransfer;
