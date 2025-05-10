const { VersionedTransaction, Keypair } = require("@solana/web3.js");
const axios = require("axios");
const FormData = require("form-data");

/**
 * @typedef {Object} PumpFunTokenOptions
 * @property {string} [twitter]
 * @property {string} [telegram]
 * @property {string} [website]
 * @property {number} [initialLiquiditySOL] - Initial liquidity in SOL. Defaults to a small amount if not provided.
 * @property {number} [slippageBps] - Slippage in basis points (e.g., 500 for 5%). Defaults to 5 if not provided.
 * @property {number} [priorityFee] - Priority fee in SOL. Defaults to a small amount if not provided.
 */

/**
 * @typedef {Object} PumpfunLaunchResponse
 * @property {string} signature - The transaction signature of the token creation.
 * @property {string} mint - The public key of the newly created mint.
 * @property {string} [metadataUri] - The URI of the uploaded metadata.
 * @property {string} [error] - An error message if the launch failed.
 */

/**
 * Uploads token metadata and image to IPFS via Pump.fun's API.
 * @param {string} tokenName - The name of the token.
 * @param {string} tokenTicker - The symbol/ticker of the token.
 * @param {string} description - A description of the token.
 * @param {string} imageUrl - A publicly accessible URL to the token's image.
 * @param {PumpFunTokenOptions} [options] - Optional social media links.
 * @returns {Promise<Object>} The API response containing metadata URI and other details.
 */
async function uploadMetadataWithAxios(tokenName, tokenTicker, description, imageUrl, options) {
  const formData = new FormData();
  formData.append("name", tokenName);
  formData.append("symbol", tokenTicker);
  formData.append("description", description);
  formData.append("showName", "true"); // As per original script

  if (options?.twitter) formData.append("twitter", options.twitter);
  if (options?.telegram) formData.append("telegram", options.telegram);
  if (options?.website) formData.append("website", options.website);

  // Fetch the image and convert it to a Buffer for FormData
  const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  if (imageResponse.status !== 200) {
    throw new Error(`Failed to fetch image from ${imageUrl}: Status ${imageResponse.status}`);
  }
  const imageBuffer = Buffer.from(imageResponse.data);
  formData.append("file", imageBuffer, { filename: "token_image.png", contentType: "image/png" });

  try {
    const metadataApiResponse = await axios.post("https://pump.fun/api/ipfs", formData, {
      headers: {
        ...formData.getHeaders(), // form-data helps set the correct Content-Type with boundary
        // Add any other headers pump.fun might require for this endpoint
      },
    });
    // Assuming the API returns a JSON response directly with metadataUri and metadata object
    // e.g., { success: true, metadataUri: "...", metadata: { name: "...", symbol: "..." } }
    return metadataApiResponse.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Metadata upload failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`Metadata upload failed: No response from server for IPFS upload - ${error.message}`);
    } else {
      throw new Error(`Metadata upload failed: ${error.message}`);
    }
  }
}

/**
 * Creates the token transaction payload using Pump.fun's API.
 * @param {Object} agent - Plain object with `connection`, `wallet`, and `wallet_address`.
 * @param {Keypair} mintKeypair - The keypair for the new mint.
 * @param {Object} metadataResponse - The response from `uploadMetadataWithAxios`.
 * @param {PumpFunTokenOptions} [options] - Options including initial liquidity, slippage, and priority fee.
 * @returns {Promise<ArrayBuffer>} The transaction data as an ArrayBuffer.
 */
async function createTokenTransactionWithAxios(agent, mintKeypair, metadataResponse, options) {
  const payload = {
    publicKey: agent.wallet_address.toBase58(), // User's wallet public key
    action: "create",
    tokenMetadata: {
      name: metadataResponse.metadata.name,    // Name from uploaded metadata
      symbol: metadataResponse.metadata.symbol,  // Symbol from uploaded metadata
      uri: metadataResponse.metadataUri,       // URI from uploaded metadata
    },
    mint: mintKeypair.publicKey.toBase58(),   // New token mint public key
    denominatedInSol: "true", // Standard for pump.fun
    amount: (options?.initialLiquiditySOL || 0.0001).toString(), // Initial liquidity in SOL, as string
    slippage: (options?.slippageBps || 5).toString(),         // Slippage basis points, as string
    priorityFee: (options?.priorityFee || 0.00005).toString(), // Priority fee in SOL, as string
    pool: "pump", // Target pool
  };

  try {
    const apiResponse = await axios.post("https://pumpportal.fun/api/trade-local", payload, {
      headers: {
        "Content-Type": "application/json",
        // Add any other headers pump.fun might require
      },
      responseType: 'arraybuffer', // To get an ArrayBuffer directly, as expected by VersionedTransaction.deserialize
    });
    return apiResponse.data; // response.data will be an ArrayBuffer
  } catch (error) {
    if (error.response) {
      let errorDetails = "Could not decode error response.";
      try {
          // Assuming error response data is also an ArrayBuffer that might contain text
          errorDetails = Buffer.from(error.response.data).toString();
      } catch (e) { /* ignore decoding error if it's not a buffer or not text */ }
      throw new Error(`Transaction creation failed: ${error.response.status} - ${errorDetails}`);
    } else if (error.request) {
      throw new Error(`Transaction creation failed: No response from server for trade-local API - ${error.message}`);
    } else {
      throw new Error(`Transaction creation failed: ${error.message}`);
    }
  }
}

/**
 * Signs and sends the transaction to the Solana network.
 * @param {Object} agent - Plain object with `connection`, `wallet` (Signer), and `wallet_address`.
 * @param {VersionedTransaction} tx - The transaction to sign and send.
 * @param {Keypair} mintKeypair - The keypair for the new mint, also a signer.
 * @returns {Promise<string>} The transaction signature.
 */
async function signAndSendTransaction(agent, tx, mintKeypair) {
  try {
    const { blockhash, lastValidBlockHeight } = await agent.connection.getLatestBlockhash();
    tx.message.recentBlockhash = blockhash;

    // The transaction needs to be signed by the user's wallet and the mint keypair
    tx.sign([agent.wallet, mintKeypair]);

    const signature = await agent.connection.sendTransaction(tx, {
      skipPreflight: false, // Set to true to skip preflight checks, false is safer
      preflightCommitment: "confirmed", // Or "processed", "finalized"
      maxRetries: 5,
    });

    const confirmation = await agent.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
      commitment: "confirmed", // Wait for confirmed status
    });

    if (confirmation.value.err) {
      throw new Error(`Transaction failed confirmation: ${JSON.stringify(confirmation.value.err)}`);
    }

    return signature;
  } catch (error) {
    console.error("Transaction send/confirmation error:", error);
    throw error; // Re-throw to be caught by the calling function
  }
}

/**
 * Launch a token on Pump.fun using axios for HTTP requests.
 * @param {Object} agent - Plain object with `connection` (Solana Connection), `wallet` (Signer object, e.g., from a wallet adapter or Keypair), and `wallet_address` (PublicKey of the user's wallet).
 * @param {string} tokenName - The name of the token (e.g., "My Awesome Token").
 * @param {string} tokenTicker - The ticker/symbol for the token (e.g., "MAT").
 * @param {string} description - A description for the token.
 * @param {string} imageUrl - A direct, public URL to an image for the token (e.g., a PNG or JPG).
 * @param {PumpFunTokenOptions} [options] - Optional parameters for the token launch.
 * @returns {Promise<PumpfunLaunchResponse>} An object containing the signature, mint address, metadata URI, or an error.
 */
async function launchPumpFunToken(agent, tokenName, tokenTicker, description, imageUrl, options = {}) {
  try {
    if (!agent || !agent.connection || !agent.wallet || !agent.wallet_address) {
        throw new Error("Agent object with connection, wallet, and wallet_address must be provided.");
    }
    if (!tokenName || !tokenTicker || !description || !imageUrl) {
        throw new Error("tokenName, tokenTicker, description, and imageUrl are required.");
    }

    const mintKeypair = Keypair.generate();
    console.log(`Generated new mint keypair: ${mintKeypair.publicKey.toBase58()}`);

    console.log("Uploading metadata...");
    const metadataResponse = await uploadMetadataWithAxios(tokenName, tokenTicker, description, imageUrl, options);
    console.log("Metadata uploaded:", metadataResponse);

    if (!metadataResponse || !metadataResponse.metadataUri || !metadataResponse.metadata || !metadataResponse.metadata.name) {
        throw new Error("Metadata upload did not return expected structure.");
    }

    console.log("Creating token transaction...");
    // createTokenTransactionWithAxios returns ArrayBuffer directly
    const transactionDataArrayBuffer = await createTokenTransactionWithAxios(agent, mintKeypair, metadataResponse, options);
    console.log("Token transaction data received, length:", transactionDataArrayBuffer.byteLength);

    const tx = VersionedTransaction.deserialize(new Uint8Array(transactionDataArrayBuffer));
    console.log("Transaction deserialized.");

    console.log("Signing and sending transaction...");
    const signature = await signAndSendTransaction(agent, tx, mintKeypair);
    console.log(`Transaction successful with signature: ${signature}`);
    console.log(`Mint Address: ${mintKeypair.publicKey.toBase58()}`);
    console.log(`Explorer link: https://solscan.io/tx/${signature}?cluster=mainnet-beta`); // Adjust cluster if needed

    return {
      signature,
      mint: mintKeypair.publicKey.toBase58(),
      metadataUri: metadataResponse.metadataUri,
    };
  } catch (error) {
    console.error("Error in launchPumpFunToken:", error.message);
    if (error.response && error.response.data) {
        // If the error is an axios error with a response, log that data
        try {
            const errorDataString = Buffer.isBuffer(error.response.data) ? error.response.data.toString() : JSON.stringify(error.response.data);
            console.error("Axios error response data:", errorDataString);
        } catch (e) {
            console.error("Could not stringify axios error data.");
        }
    }
    return { error: error.message };
  }
}

module.exports = {
  launchPumpFunToken,
  // You might also want to export the helper functions if they are useful elsewhere
  // uploadMetadataWithAxios,
  // createTokenTransactionWithAxios,
};

// Example Usage (ensure you have an 'agent' object properly configured):
/*
async function main() {
  // THIS IS EXAMPLE SETUP - REPLACE WITH YOUR ACTUAL AGENT CONFIGURATION
  // const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
  // const bs58 = require('bs58');

  // const connection = new Connection("https://api.mainnet-beta.solana.com"); // Or your preferred RPC
  // const privateKeyString = "YOUR_WALLET_PRIVATE_KEY_BS58_ENCODED"; // BE VERY CAREFUL WITH PRIVATE KEYS
  // const walletKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyString));
  // const walletPublicKey = walletKeypair.publicKey;

  // const agent = {
  //   connection: connection,
  //   wallet: walletKeypair, // This needs to be a Signer object
  //   wallet_address: walletPublicKey
  // };

  // const tokenDetails = {
  //   tokenName: "My Test Token Axios",
  //   tokenTicker: "MTTA",
  //   description: "This is a test token launched with Axios via Pump.fun.",
  //   imageUrl: "https://example.com/path/to/your/image.png", // REPLACE WITH A REAL, PUBLIC IMAGE URL
  //   options: {
  //     twitter: "https://twitter.com/yourprofile",
  //     telegram: "https://t.me/yourgroup",
  //     website: "https://yourwebsite.com",
  //     initialLiquiditySOL: 0.01, // e.g., 0.01 SOL
  //     slippageBps: 50, // 0.5% slippage
  //     priorityFee: 0.0001 // 0.0001 SOL priority fee
  //   }
  // };

  // console.log("Launching token...");
  // const result = await launchPumpFunToken(
  //   agent,
  //   tokenDetails.tokenName,
  //   tokenDetails.tokenTicker,
  //   tokenDetails.description,
  //   tokenDetails.imageUrl,
  //   tokenDetails.options
  // );

  // if (result.error) {
  //   console.error("Failed to launch token:", result.error);
  // } else {
  //   console.log("Token launched successfully!");
  //   console.log("Signature:", result.signature);
  //   console.log("Mint:", result.mint);
  //   console.log("Metadata URI:", result.metadataUri);
  // }
}

main().catch(err => {
  console.error("Unhandled error in main:", err);
});
*/