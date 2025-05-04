const { createEvmWallet } = require('./main/evmwallet');
const { createSolanaWallet } = require('./main/solanawallet');
const { createWalletFromMnemonic, createWalletFromPrivateKey } = require('./main/importwallet');
const { importWalletFromPrivateKey, importWalletFromSeedPhrase } = require('./main/importwalletsolana');
const evmBalance = require('./main/evmbalance');
const sendtxnevm = require('./transfertoken/nativetokenevm');
const createEVM = createEvmWallet();
const { ethers } = require('ethers');
const transferevmtoken = require('./transfertoken/evmtoken');
const { solnativetransfer } = require('./transfertoken/nativesoltoken');
const spltokentransfer = require('./transfertoken/soltoken');


console.log('New EVM Chain Wallet Created:');
console.log('Address:', createEVM.address);
console.log('Private Key:', createEVM.privateKey);
console.log('Mnemonic:',createEVM.mnemonic);


const walletDetailcheck = createSolanaWallet();
console.log('New Solana wallet created:');
console.log('Address:',   walletDetailcheck.publicKey);
console.log('Private key:', walletDetailcheck.secretKeyHex);
console.log('Mnemonic:',walletDetailcheck.mnemonic);


const mnemonic = 'error raw spirit mail prefer beef resist pipe note ankle stamp file';
const privateKey = '35501ee6920610b1b2f395bab96abbcea3e1eeb6ff927729ab0d435b51ef037c';

const walletFromMnemonic = createWalletFromMnemonic(mnemonic);
if (walletFromMnemonic) {
    console.log('Wallet from Mnemonic:');
    console.log('Address:', walletFromMnemonic.address);
    console.log('Private Key:', walletFromMnemonic.privateKey);
}

const walletFromPrivateKey = createWalletFromPrivateKey(privateKey);
if (walletFromPrivateKey) {
    console.log('\nWallet from Private Key:');
    console.log('Address:', walletFromPrivateKey.address);
    console.log('Private Key:', walletFromPrivateKey.privateKey);
}

const privateKeyHexSOL = '32eb6a66ef1edc2af5281e5f6a20bab17120c67afb518404eaef0dd100ff21bee1a660c8b5696c2683bdf05c73f4fb1a0416b3e5c918a551a675f65c86677c0d';
importWalletFromPrivateKey(privateKeyHexSOL);

const seedPhraseSOL = 'inmate news gaze butter surprise weapon public avoid bicycle syrup staff rack';
importWalletFromSeedPhrase(seedPhraseSOL);


// Check for the balance
const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
evmBalance(address);

// Comment out if you'r perform one of txn (in prod)


// const tx = {
//     from: "0x54AFc632a75cc2A0939875F788c9757ee67c7f61",
//     to: "0x9ce7502008734772935A538Fb829741153Ca74f0",
//     value: ethers.parseUnits("0.001", "ether"),
//     gasLimit: 21000,
//     gasPrice: ethers.parseUnits("50", "gwei"),
// };

// sendtxnevm(tx, privateKey);





//token transfer of evm tokens

const contractAddress = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // or any other address you want to use
const toAddress = '0x4e79442b5667c8dfC097c698da93e905A3A0d83E';
const value = 1000;

(async () => {
  try {
    const txHash = await transferevmtoken(privateKey, contractAddress, toAddress, value);
    console.log('Transaction Hash of erc20 transfer:', txHash);
  } catch (error) {
    console.error(error.message);
  }
})();


// Solana token transfer Native Token
const feePayerSecretKey = '';
const aliceSecretKey = '';
const toPublicKey = '';
const amount = 0.01;
(async () => {
    await solnativetransfer(feePayerSecretKey, aliceSecretKey, toPublicKey, amount);
  })();
  

  // Solana SPL Token transfer 
  const privateKeyHex =  [223,243,142,229,133,176,44];
const DESTINATION_WALLET = 'FDRd4BfnAsMhusifdsSrxrJyHtpLsoPUrDB1HzAzghix';
const MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // You must change this value!
const TRANSFER_AMOUNT = 1;

spltokentransfer(privateKeyHex, DESTINATION_WALLET, MINT_ADDRESS, TRANSFER_AMOUNT);