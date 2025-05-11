const bs58 = require("bs58");
const { Connection, clusterApiUrl, Keypair, PublicKey } = require("@solana/web3.js");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");

// Configuration
const MASTER_EDITION_MINT_ADDRESS = ""; // The address of your master edition NFT
const RECIPIENT_ADDRESS = ""; // Optional: Address to receive the new edition (leave empty to send to yourself)

// 1. Set up your wallet and connection
const base58PrivateKey = process.env.SOLANA_PRIVATE_KEY; // 🔐 Your private key here
const secretKey = bs58.decode(base58PrivateKey);
const keypair = Keypair.fromSecretKey(secretKey);

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));

/**
 * Prints a new edition from a master edition NFT
 * @param {string} masterEditionMintAddress - The mint address of the master edition
 * @param {string|null} recipientAddress - Optional address to receive the new edition
 */
async function printNewEdition(masterEditionMintAddress, recipientAddress = null) {
  try {
    console.log("🔍 Fetching master edition details...");
    const masterEditionMint = new PublicKey(masterEditionMintAddress);
    
    // Fetch the master edition to get its details
    const masterEdition = await metaplex.nfts().findByMint({ mintAddress: masterEditionMint });
    
    console.log(`📝 Master Edition details:`);
    console.log(`   - Name: ${masterEdition.name}`);
    console.log(`   - Symbol: ${masterEdition.symbol}`);
    console.log(`   - Current Supply: ${masterEdition.edition?.supply?.toString() || "Unknown"}`);
    console.log(`   - Max Supply: ${masterEdition.edition?.maxSupply?.toString() || "Unlimited"}`);
    
    // Check if we can still mint editions
    if (masterEdition.edition?.maxSupply && 
        masterEdition.edition?.supply && 
        masterEdition.edition.supply >= masterEdition.edition.maxSupply) {
      console.error(`❌ Cannot mint new edition: Maximum supply reached`);
      return;
    }
    
    // Prepare the edition printing
    let printEditionInput = {
      originalMint: masterEditionMint,
    };
    
    // If recipient address provided, add it to the options
    if (recipientAddress) {
      printEditionInput.newOwner = new PublicKey(recipientAddress);
    }
    
    console.log(`🖨️ Printing new edition...`);
    const { nft: newEdition } = await metaplex.nfts().printNewEdition(printEditionInput);
    
    console.log(`✅ New edition printed successfully!`);
    console.log(`   - Edition Mint: ${newEdition.address.toBase58()}`);
    console.log(`   - Owner: ${newEdition.token.ownerAddress.toBase58()}`);
    console.log(`   - View on Explorer: https://explorer.solana.com/address/${newEdition.address.toBase58()}?cluster=devnet`);
    
    return newEdition;
  } catch (error) {
    console.error(`❌ Error printing new edition:`, error.message);
    if (error.logs) {
      console.error("Error logs:", error.logs);
    }
    throw error;
  }
}

// Execute the function
(async () => {
  try {
    console.log("💰 Checking wallet balance...");
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`   - Current balance: ${balance / 1e9} SOL`);
    
    if (balance < 0.01 * 1e9) {
      console.warn("⚠️ Warning: Low balance. You may need more SOL to mint an edition.");
    }
    
    if (!MASTER_EDITION_MINT_ADDRESS) {
      console.error("❌ Error: Master edition mint address is required.");
      return;
    }
    
    console.log(`🎯 Target Master Edition: ${MASTER_EDITION_MINT_ADDRESS}`);
    if (RECIPIENT_ADDRESS) {
      console.log(`📬 Recipient Address: ${RECIPIENT_ADDRESS}`);
    } else {
      console.log(`📬 Recipient: Self (${keypair.publicKey.toBase58()})`);
    }
    
    await printNewEdition(MASTER_EDITION_MINT_ADDRESS, RECIPIENT_ADDRESS);
    
  } catch (err) {
    console.error("❌ Process failed:", err);
  }
})();