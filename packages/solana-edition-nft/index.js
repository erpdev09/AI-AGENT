const fs = require("fs");
const bs58 = require("bs58");
const { Connection, clusterApiUrl, Keypair } = require("@solana/web3.js");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const { Uploader } = require("@irys/upload");
const { Solana } = require("@irys/upload-solana");

const base58PrivateKey = process.env.SOLANA_PRIVATE_KEY; // 🔐 Your private key here
const secretKey = bs58.decode(base58PrivateKey);
const keypair = Keypair.fromSecretKey(secretKey);

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
const rpcURL = "https://api.devnet.solana.com";

const getIrysUploader = async () => {
  const irysUploader = await Uploader(Solana)
    .withWallet(secretKey)
    .withRpc(rpcURL)
    .devnet();
  return irysUploader;
};

const fundIrysAccount = async () => {
  const irysUploader = await getIrysUploader();
  try {
    const fundTx = await irysUploader.fund(irysUploader.utils.toAtomic(0.0005));
    console.log(`✅ Funded: ${irysUploader.utils.fromAtomic(fundTx.quantity)} ${irysUploader.token}`);
  } catch (e) {
    console.error("❌ Error funding Irys:", e);
    throw e;
  }
};

(async () => {
  try {
    const balance = await connection.getBalance(keypair.publicKey);
    console.log("💰 Wallet balance:", balance / 1e9, "SOL");
    
    await fundIrysAccount();
    const irysUploader = await getIrysUploader();
    
    const imagePath = "assets/image.png";
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
      name: "My First Solana NFT",
      symbol: "MFSN",
      description: "Minted on Solana using Node.js",
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
    const EDITION_SUPPLY = 5; // Total number of editions you want
    
    const { nft: masterEdition } = await metaplex.nfts().create({
      uri: metadataUri,
      name: "My First Solana NFT",
      sellerFeeBasisPoints: 500, // 5% royalties
      symbol: "MFSN",
      maxSupply: EDITION_SUPPLY, // Set the maximum supply
      isMutable: true,
      creators: [
        {
          address: keypair.publicKey,
          share: 100,
          verified: true,
        },
      ],
    });
    
    console.log(`✅ Master Edition NFT created with fixed supply of ${EDITION_SUPPLY}:`);
    console.log(`   - Mint: ${masterEdition.address.toBase58()}`);
    console.log(`   - Max Supply: ${masterEdition.edition.maxSupply?.toString() || "Unlimited"}`);
    console.log(`   - Owner: ${masterEdition.token.ownerAddress.toBase58()}`);
    
    // To verify the NFT on Solana Explorer:
    console.log(`🔍 View on Explorer: https://explorer.solana.com/address/${masterEdition.address.toBase58()}?cluster=devnet`);

  } catch (err) {
    console.error("❌ Error:", err);
  }
})();