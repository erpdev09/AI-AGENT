const solanaWeb3 = require('@solana/web3.js');
const bip39 = require('bip39');
const { Keypair } = solanaWeb3;

function createSolanaWallet() {
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const keyPair = Keypair.fromSeed(seed.slice(0, 32));

    const publicKey = keyPair.publicKey.toString();
    const secretKeyBuffer = keyPair.secretKey;
    const secretKeyHexValues = Array.from(secretKeyBuffer)
        .map(value => value.toString(16).padStart(2, '0'))
        .join('');

    return {
        mnemonic: mnemonic,
        publicKey: publicKey,
        secretKeyHex: secretKeyHexValues
    };
}

module.exports = { createSolanaWallet };