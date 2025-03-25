const { ethers } = require('ethers');
function createWalletFromMnemonic(mnemonic) {
    try {
        const wallet = ethers.Wallet.fromPhrase(mnemonic);
        return wallet;
    } catch (error) {
        console.error('Error creating wallet from mnemonic:', error.message);
    }
}
function createWalletFromPrivateKey(privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey);
        return wallet;
    } catch (error) {
        console.error('Error creating wallet from private key:', error.message);
    }
}
module.exports = {
    createWalletFromMnemonic,
    createWalletFromPrivateKey
};