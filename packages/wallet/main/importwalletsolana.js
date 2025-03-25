const solanaWeb3 = require('@solana/web3.js');
const bip39 = require('bip39');
const { Buffer } = require('buffer');

function importWalletFromPrivateKey(privateKeyHexSOL) {
    try {
        const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
        const keyPair = solanaWeb3.Keypair.fromSecretKey(privateKeyBuffer);
        const publicKey = keyPair.publicKey.toString();

        console.log('Imported Solana wallet address:', publicKey); 
        console.log('Private key (hex):', privateKeyHexSOL); 

        return { publicKey, privateKeyHexSOL: privateKeyHexSOL };
    } catch (error) {
        console.error('Error importing wallet from private key:', error.message);
    }
}

function importWalletFromSeedPhrase(seedPhraseSOL) {
    try {
        if (!bip39.validateMnemonic(seedPhraseSOL)) {
            throw new Error('Invalid seed phrase');
        }
        const seed = bip39.mnemonicToSeedSync(seedPhraseSOL);
        const { secretKey } = solanaWeb3.Keypair.fromSeed(seed.slice(0, 32));

        const keyPair = solanaWeb3.Keypair.fromSecretKey(secretKey);
        const publicKey = keyPair.publicKey.toString();

        console.log('Derived Solana wallet address:', publicKey);
        console.log('Derived private key (hex):', Buffer.from(secretKey).toString('hex'));

        return { publicKey, privateKey: Buffer.from(secretKey).toString('hex') };
    } catch (error) {
        console.error('Error deriving wallet from seed phrase:', error.message);
    }
}

module.exports = {
    importWalletFromPrivateKey,
    importWalletFromSeedPhrase
};