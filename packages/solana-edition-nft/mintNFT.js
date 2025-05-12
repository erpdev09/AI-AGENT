const fs = require("fs");
const bs58 = require("bs58");
const path = require('path');
const { Connection, clusterApiUrl, Keypair } = require("@solana/web3.js");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const { Uploader } = require("@irys/upload");
const { Solana } = require("@irys/upload-solana");

// Load environment variables from the specified path
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// 🔐 Get your private key from environment variables
const base58PrivateKey = process.env.SOLANA_PRIVATE_KEY;

// --- FIX START ---
// Check if the private key was loaded correctly
if (!base58PrivateKey || typeof base58PrivateKey !== 'string') {
    console.error("❌ Error: SOLANA_PRIVATE_KEY environment variable is not set or is not a string.");
    console.error("Please ensure you have a .env file in the parent directory of this script (relative to launch/ directory) with the following format:");
    console.error("SOLANA_PRIVATE_KEY=YOUR_BASE58_ENCODED_PRIVATE_KEY");
    process.exit(1); // Exit the process
}

// Decode the base58 private key
const secretKey = bs58.decode(base58PrivateKey);
// --- FIX END ---


const keypair = Keypair.fromSecretKey(secretKey);

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
const rpcURL = "https://api.devnet.solana.com";

const getIrysUploader = async () => {
    // Note: .withWallet expects a Uint8Array or Buffer (the secret key array),
    // which is what bs58.decode returns.
    const irysUploader = await Uploader(Solana)
        .withWallet(secretKey) // Use the decoded secretKey here
        .withRpc(rpcURL)
        .devnet();
    return irysUploader;
};

const fundIrysAccount = async () => {
    const irysUploader = await getIrysUploader();
    try {
        // Check balance first to avoid unnecessary funding calls
        const balance = await irysUploader.utils.getBalance();
        const requiredFund = irysUploader.utils.toAtomic(0.0005); // Example amount
        console.log(`💰 Irys balance: ${irysUploader.utils.fromAtomic(balance)} ${irysUploader.token}`);

        if (balance.lt(requiredFund)) {
             console.log(`Funding Irys with ${irysUploader.utils.fromAtomic(requiredFund)} ${irysUploader.token}...`);
             const fundTx = await irysUploader.fund(requiredFund);
             console.log(`✅ Funded: ${irysUploader.utils.fromAtomic(fundTx.quantity)} ${irysUploader.token}`);
        } else {
            console.log("✅ Irys balance is sufficient.");
        }

    } catch (e) {
        console.error("❌ Error funding Irys:", e);
        // Decide if you want to throw or just log and continue.
        // Throwing will stop the minting process if funding fails.
        throw e;
    }
};


const mintNFT = async ({ imagePath, name, symbol, description, editionSupply }) => {
    try {
        const walletBalance = await connection.getBalance(keypair.publicKey);
        console.log("💰 Wallet balance:", walletBalance / 1e9, "SOL");

        // Fund Irys account before attempting uploads
        await fundIrysAccount();
        const irysUploader = await getIrysUploader();

        if (!fs.existsSync(imagePath)) throw new Error(`Image not found at: ${imagePath}`);

        // Upload image
        const imageTags = [
            { name: "Content-Type", value: "image/png" },
            { name: "application-id", value: "MyNFTDrop" },
        ];
        const imageReceipt = await irysUploader.uploadFile(imagePath, { tags: imageTags });
        const imageUri = `https://gateway.irys.xyz/${imageReceipt.id}`;
        console.log("🖼️ Image uploaded to:", imageUri);

        // Metadata
        const metadata = {
            name,
            symbol,
            description,
            image: imageUri,
            attributes: [{ trait_type: "Type", value: "Digital Art" }],
            properties: {
                files: [{ uri: imageUri, type: "image/png" }],
                category: "image",
            },
        };

        const metadataBuffer = Buffer.from(JSON.stringify(metadata));
        const metadataTags = [
            { name: "Content-Type", value: "application/json" },
            { name: "application-id", value: "MyNFTDrop" },
        ];
        const metadataReceipt = await irysUploader.upload(metadataBuffer, { tags: metadataTags });
        const metadataUri = `https://gateway.irys.xyz/${metadataReceipt.id}`;
        console.log("📝 Metadata URI:", metadataUri);

        // Create Master Edition with fixed supply
        const { nft: masterEdition } = await metaplex.nfts().create({
            uri: metadataUri,
            name,
            sellerFeeBasisPoints: 500, // 5% royalties
            symbol,
            maxSupply: editionSupply, // Set the maximum supply
            isMutable: true,
            creators: [
                {
                    address: keypair.publicKey,
                    share: 100,
                    verified: true, // Ensure this is true if using Metaplex default creator verification
                },
            ],
            // Add confirmation options if needed, e.g., { commitment: "confirmed" }
        });

        console.log(`✅ Master Edition NFT created with fixed supply of ${editionSupply}:`);
        console.log(`   - Mint: ${masterEdition.address.toBase58()}`);
        console.log(`   - Max Supply: ${masterEdition.edition.maxSupply?.toString() || "Unlimited"}`);
        console.log(`   - Owner: ${masterEdition.token.ownerAddress.toBase58()}`);

        // To verify the NFT on Solana Explorer:
        console.log(`🔍 View on Explorer: https://explorer.solana.com/address/${masterEdition.address.toBase58()}?cluster=devnet`);
        // Return the master edition object for further use if needed
        return masterEdition;
    } catch (err) {
        console.error("❌ Error:", err);
        throw err; // Re-throw the error so the caller knows it failed
    }
};

module.exports = mintNFT;