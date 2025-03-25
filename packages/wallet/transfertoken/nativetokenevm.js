const { ethers } = require('ethers');
const infuraUrl = "https://bsc-testnet-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(infuraUrl);

const sendtxnevm = async (tx, privateKey) => {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const txResponse = await wallet.sendTransaction(tx);
        console.log("Transaction hash:", txResponse.hash); // can change later txReponse has the whole necessary response
    } catch (error) {
        console.error("Error sending transaction:", error);
    }
}
module.exports = sendtxnevm;