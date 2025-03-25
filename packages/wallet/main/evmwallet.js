const { ethers } = require('ethers');

function createEvmWallet() {
    console.log('Creating EVM Wallet');
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const mnemonic = wallet.mnemonic.phrase;

    return {
        address: wallet.address,
        privateKey: privateKey,
        mnemonic: mnemonic
    };
}

module.exports = { createEvmWallet };