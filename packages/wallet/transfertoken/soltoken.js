const { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
const { Buffer } = require('buffer');

/**
 * Transfers tokens on the Solana blockchain.
 * @param {string} privateKeyHex - The private key in hexadecimal format.
 * @param {string} destinationWallet - The recipient's wallet address.
 * @param {string} mintAddress - The mint address of the token.
 * @param {number} transferAmount - The amount of tokens to transfer.
 */
async function spltokentransfer(privateKeyHex, destinationWallet, mintAddress, transferAmount) {
    const secretKeyBuffer = Buffer.from(privateKeyHex, 'hex');
    const secretKeyUint8Array = new Uint8Array(secretKeyBuffer);
    const FROM_KEYPAIR = Keypair.fromSecretKey(secretKeyUint8Array);

    const QUICKNODE_RPC = 'https://solana-mainnet.g.alchemy.com/v2/F7d6zXGka1Trjja3PHsgREIC521SrKak';
    const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC);

    async function getNumberDecimals(mintAddress) {
        const info = await SOLANA_CONNECTION.getParsedAccountInfo(new PublicKey(mintAddress));
        const result = info.value?.data.parsed.info.decimals;
        return result;
    }

    console.log(`Sending ${transferAmount} tokens from ${FROM_KEYPAIR.publicKey.toString()} to ${destinationWallet}.`);
    
    console.log(`1 - Getting Source Token Account`);
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        FROM_KEYPAIR,
        new PublicKey(mintAddress),
        FROM_KEYPAIR.publicKey
    );
    console.log(`    Source Account: ${sourceAccount.address.toString()}`);

    console.log(`2 - Getting Destination Token Account`);
    let destinationAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        FROM_KEYPAIR,
        new PublicKey(mintAddress),
        new PublicKey(destinationWallet)
    );
    console.log(`    Destination Account: ${destinationAccount.address.toString()}`);

    console.log(`3 - Fetching Number of Decimals for Mint: ${mintAddress}`);
    const numberDecimals = await getNumberDecimals(mintAddress);
    console.log(`   Number of Decimals: ${numberDecimals}`);

    console.log(`4 - Creating and Sending Transaction`);

    const tx = new Transaction();
    tx.add(createTransferInstruction(
        sourceAccount.address,
        destinationAccount.address,
        FROM_KEYPAIR.publicKey,
        transferAmount * Math.pow(10, numberDecimals)
    ));

    const latestBlockHash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
    console.log(`   Latest Blockhash: ${latestBlockHash.blockhash}`);
    
    tx.recentBlockhash = latestBlockHash.blockhash;
    tx.feePayer = FROM_KEYPAIR.publicKey;

    try {
        const signature = await sendAndConfirmTransaction(SOLANA_CONNECTION, tx, [FROM_KEYPAIR]);
        console.log(
            '\x1b[32m',
            `   Transaction Success!🎉`,
            `\n     https://explorer.solana.com/tx/${signature}?cluster=mainnet`
        );
    } catch (error) {
        console.error('\x1b[31m', `   Transaction Failed: ${error}`);
    }
}

module.exports = spltokentransfer;