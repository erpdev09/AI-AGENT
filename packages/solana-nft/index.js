const fs = require("fs");
const bs58 = require("bs58");
const { Connection, clusterApiUrl, Keypair } = require("@solana/web3.js");
const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const { Uploader } = require("@irys/upload");
const { Solana } = require("@irys/upload-solana");


const base58PrivateKey = "";
const secretKey = bs58.decode(base58PrivateKey);
const keypair = Keypair.fromSecretKey(secretKey);


const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));
const rpcURL = "https://api.devnet.solana.com"; 

const getIrysUploader = async () => {
  const irysUploader = await Uploader(Solana).withWallet(secretKey)
  .withRpc(rpcURL)
  .devnet();
  return irysUploader;
};

const fundIrysAccount = async () => {
  const irysUploader = await getIrysUploader();
  try {
    const fundTx = await irysUploader.fund(irysUploader.utils.toAtomic(0.0005));
    console.log(`Successfully funded ${irysUploader.utils.fromAtomic(fundTx.quantity)} ${irysUploader.token}`);
  } catch (e) {
    console.error("Error funding Irys:", e);
    throw e;
  }
};

(async () => {
  try {
    const balance = await connection.getBalance(keypair.publicKey);
    console.log("Wallet balance:", balance / 1e9, "SOL");
    await fundIrysAccount();
    const irysUploader = await getIrysUploader();
    const imagePath = "assets/image.png";
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at ${imagePath}`);
    }

    const imageTags = [
      { name: "Content-Type", value: "image/png" },
      { name: "application-id", value: "MyNFTDrop" },
    ];
    const imageReceipt = await irysUploader.uploadFile(imagePath, { tags: imageTags });
    const imageUri = `https://gateway.irys.xyz/${imageReceipt.id}`;
    console.log("Image uploaded to:", imageUri);

 
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
    console.log("Metadata URI:", metadataUri);

 
    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: "My First Solana NFT",
      symbol: "MFSN",
      sellerFeeBasisPoints: 500,
      isMutable: true,
      maxSupply: 1,
    });

    console.log("NFT minted successfully:", nft.address.toBase58());
  } catch (err) {
    console.error("Error minting NFT:", err);
  }
})();
