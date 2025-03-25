const axios = require('axios');

const rpcUrls = [
  "https://rpc.mainnet.taiko.xyz",
  "https://rpc.ankr.com/eth",
  "https://bsc-mainnet.public.blastapi.io",
  "https://moonriver.unitedbloc.com",
  "https://optimism-mainnet.public.blastapi.io",
  "https://polygon.drpc.org",
  "https://arbitrum.llamarpc.com",
  "https://base.llamarpc.com",
  "https://avalanche-c-chain-rpc.publicnode.com",
  "https://linea.blockpi.network/v1/rpc/public",
  "https://1rpc.io/mantle",
  "https://rpc.gnosis.gateway.fm",
  "https://rpc.nebkas.ro",
  "https://pulsechain-rpc.publicnode.com",
];

async function checkBalance(rpcUrl, address) {
  try {
    console.log("RPC URL:", rpcUrl);

    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    });

    const balanceWei = response.data.result;
    const balanceEther = parseInt(balanceWei, 16) / 1e18;

    console.log(`Balance of address ${address} at ${rpcUrl}: ${balanceEther} ETH`);
  } catch (error) {
    console.error(`Error fetching balance from ${rpcUrl}:`, error);
  }
}

async function evmBalance(address) {
  const promises = rpcUrls.map(rpcUrl => checkBalance(rpcUrl, address));
  await Promise.all(promises);
}

module.exports = evmBalance;