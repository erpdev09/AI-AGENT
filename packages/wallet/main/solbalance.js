const axios = require('axios');
const rpcUrl = 'https://solana-mainnet.g.alchemy.com/v2/kwdXy205qV9NdOqVcviW7l8oRYx3ZFmM';

async function getSolanaBalance(address) {
  let responseText;

  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "getBalance",
      params: [address],
      id: 1,
    });

    const balanceInLamports = response.data.result.value;
    const balanceInSol = balanceInLamports / 1e9; 

    responseText = `Your Solana balance is ${balanceInSol} SOL`;
    console.log(responseText); 
  } catch (error) {
    console.error("Error fetching Solana balance:", error);
    responseText = "Error fetching Solana balance. Please try again later.";
  }

  return responseText;
}

// Example usage
const address = '6dUaYX9Z6aQPY66BgD4yzu1saifGAZLrhQqF9BugJxJ1'; 
getSolanaBalance(address)