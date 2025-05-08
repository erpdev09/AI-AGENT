const bs58 = require("bs58");
const { Connection, clusterApiUrl, Keypair } = require("@solana/web3.js");
const { createTipLinkWithFunds } = require("../main/createTipLink");

const base58PrivateKey = ""; 
const secretKey = bs58.decode(base58PrivateKey);
const payer = Keypair.fromSecretKey(secretKey);

const connection = new Connection(clusterApiUrl("devnet"));

(async () => {
  const result = await createTipLinkWithFunds({
    connection,
    payer,
    amount: 0.1,
  });

  console.log("TipLink URL:", result.url);
  console.log("Transaction Signature:", result.signature);
})();
