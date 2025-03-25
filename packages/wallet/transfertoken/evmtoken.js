const {Web3} = require('web3');
const ABI = [
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
];

async function transferevmtoken(privateKey, contractAddress, toAddress, value) {
  try {
    const web3 = new Web3('https://bsc-testnet-rpc.publicnode.com');
    if (privateKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error('Invalid private key format.');
    }
    const wallet = web3.eth.accounts.wallet.add(`0x${privateKey}`);
    const myERC20 = new web3.eth.Contract(ABI, contractAddress);
    const txReceipt = await myERC20.methods.transfer(toAddress, value).send({
      from: wallet[0].address,
      type: 2, 
    });
    return txReceipt.transactionHash;
  } catch (error) {
    throw new Error('Error during transfer: ' + error.message);
  }
}

module.exports = transferevmtoken;