const { VersionedTransaction, Keypair } = require("@solana/web3.js");
const axios = require("axios");
const FormData = require("form-data");
const fs = require('fs').promises; // Use promise version for async/await
const path = require('path');

/**
 * Uploads token metadata to IPFS via Pump.fun's API by downloading and uploading the image file.
 * @param {string} tokenName - The name of the token.
 * @param {string} tokenTicker - The symbol/ticker of the token.
 * @param {string} description - A description of the token.
 * @param {string} imageUrl - A publicly accessible URL to the token's image.
 * @param {Object} options - Optional social media links.
 * @returns {Promise<Object>} The API response containing metadata URI and other details.
 */
async function uploadMetadataWithAxios(tokenName, tokenTicker, description, imageUrl, options) {
  const tempDir = 'tempfolder';
  // Generate a simple unique filename, perhaps based on ticker or a timestamp
  const localFileName = `${tokenTicker || 'token'}_${Date.now()}.png`;
  const localFilePath = path.join(tempDir, localFileName);

  let imageBuffer; // Variable to hold the image buffer
  let metadataApiResponse; // Variable to hold the final response

  try {
    // 1. Create the temporary directory if it doesn't exist
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`Ensured temporary directory exists: ${tempDir}`);

    // 2. Download the image from the provided URL
    console.log(`Downloading image from URL: ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer' // Get the response data as an ArrayBuffer
    });
    const imageData = imageResponse.data;
    console.log(`Downloaded image data size: ${imageData.byteLength} bytes`);

    // 3. Save the downloaded image data to a local file
    console.log(`Saving image to local file: ${localFilePath}`);
    await fs.writeFile(localFilePath, imageData);
    console.log(`Image successfully saved locally.`);

    // 4. Read the saved image file into a Buffer
    console.log(`Reading image from local file into buffer: ${localFilePath}`);
    imageBuffer = await fs.readFile(localFilePath);
    console.log(`Image read into buffer.`);

    // 5. Prepare FormData with the local image file buffer
    const formData = new FormData();
    formData.append("name", tokenName);
    formData.append("symbol", tokenTicker);
    formData.append("description", description);
    formData.append("showName", "true"); // As per original script
    // Append the image buffer with the field name (commonly "file" or "image"), the buffer, and the filename
    // NOTE: The exact field name ("file" in this case) is inferred or needs confirmation from Pump.fun's API requirements.
    formData.append("file", imageBuffer, localFileName); // Append the file buffer

    if (options?.twitter) formData.append("twitter", options.twitter);
    if (options?.telegram) formData.append("telegram", options.telegram);
    if (options?.website) formData.append("website", options.website);

    // 6. Upload the metadata including the attached image file
    console.log("Uploading metadata with image file to Pump.fun IPFS API...");
    metadataApiResponse = await axios.post("https://pump.fun/api/ipfs", formData, {
      headers: {
        ...formData.getHeaders(), // form-data helps set the correct Content-Type with boundary
      },
    });
    console.log("Metadata upload successful.");

    return metadataApiResponse.data; // Return the API response data

  } catch (error) {
    // Enhanced error handling for different stages
    console.error("Error during image processing or metadata upload:");
    if (error.response) {
      let errorDetails = "Could not decode error response data.";
      try {
          // Attempt to decode potential error response data (might be JSON or text in ArrayBuffer)
          errorDetails = Buffer.from(error.response.data).toString();
      } catch (e) { /* ignore decoding error if it's not a buffer or not text */ }
      console.error(`API Error: Status ${error.response.status}, Data: ${errorDetails}`);
      throw new Error(`Metadata upload failed: ${error.response.status} - ${errorDetails}`);
    } else if (error.request) {
      console.error(`Network Error: No response received from server.`);
      throw new Error(`Metadata upload failed: No response from server for IPFS upload - ${error.message}`);
    } else {
      console.error(`General Error: ${error.message}`);
      // Add details if it was a file system error (download, read, write)
      if (error.code) console.error(`Error Code: ${error.code}`);
      throw new Error(`Metadata upload failed: ${error.message}`);
    }

  } finally {
    // 7. Clean up the local temporary file
    console.log(`Attempting to clean up temporary file: ${localFilePath}`);
    try {
      // Check if the file exists before trying to delete
      await fs.access(localFilePath);
      await fs.unlink(localFilePath);
      console.log(`Temporary file deleted: ${localFilePath}`);
    } catch (cleanupError) {
      // Ignore error if file didn't exist or couldn't be deleted
      console.warn(`Warning: Could not delete temporary file ${localFilePath}: ${cleanupError.message}`);
    }
  }
}


/**
 * Creates the token transaction payload using Pump.fun's API.
 * @param {Object} agent - Plain object with `connection`, `wallet`, and `wallet_address`.
 * @param {Keypair} mintKeypair - The keypair for the new mint.
 * @param {Object} metadataResponse - The response from `uploadMetadataWithAxios`.
 * @param {Object} options - Options including initial liquidity, slippage, and priority fee.
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
 * @param {Object} agent - Plain object with `connection`, `wallet`, and `wallet_address`.
 * @param {string} tokenName - The name of the token.
 * @param {string} tokenTicker - The ticker/symbol for the token.
 * @param {string} description - A description for the token.
 * @param {string} imageUrl - A direct, public URL to an image for the token.
 * @param {Object} options - Optional parameters for the token launch.
 * @returns {Promise<Object>} An object containing the signature, mint address, metadata URI, or an error.
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
    // This function now handles download -> save -> read -> upload file
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
    // Log the full error object in detail if it has one (e.g., axios errors)
    if (error.response && error.response.data) {
        try {
            const errorDataString = Buffer.isBuffer(error.response.data) ? error.response.data.toString() : JSON.stringify(error.response.data);
            console.error("Axios error response data:", errorDataString);
        } catch (e) {
            console.error("Could not stringify axios error data.");
        }
    } else if (error.request) {
         console.error("Axios error request:", error.request);
    } else {
         console.error("Full error object:", error);
    }
    return { error: error.message || "An unexpected error occurred during token launch." };
  }
}

module.exports = {
  launchPumpFunToken,
};