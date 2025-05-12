const bs58 = require("bs58");
const axios = require("axios");
const { Connection, clusterApiUrl, Keypair } = require("@solana/web3.js");

// Custom modules
const { createTipLinkWithFunds } = require("../main/createTipLink");

// Database connection setup
let pool;
try {
    const dbConfig = require("../../../config/dbconnect");
    pool = dbConfig.pool;
    
    if (!pool) {
        console.error("Database pool is undefined. Checking if there's an alternative export...");
        // Some modules export the pool differently
        pool = dbConfig.default?.pool || dbConfig.connection || dbConfig;
    }
    
    console.log("Database configuration loaded:", !!pool ? "Success" : "Failed");
} catch (error) {
    console.error("Failed to load database configuration:", error.message);
    // Continue without database functionality
    console.warn("Will proceed without database updates");
}

// --- Configuration ---
const base58PrivateKey = "";
if (!base58PrivateKey) {
    console.error("FATAL ERROR: Missing base58 private key in configuration.");
    process.exit(1);
}

// Decode the private key and create a Keypair
let payer;
try {
    const secretKey = bs58.decode(base58PrivateKey);
    payer = Keypair.fromSecretKey(secretKey);
} catch (error) {
    console.error("FATAL ERROR: Invalid base58 private key.", error);
    process.exit(1);
}

// Establish connection to the Solana devnet cluster
const connection = new Connection(clusterApiUrl("devnet"));

// --- Main Function ---
(async () => {
    console.log("Starting tip link creation process...");
    
    try {
        // Check database connection first
        if (pool) {
            try {
                await pool.query('SELECT NOW()');
                console.log("✅ Database connection verified");
            } catch (dbError) {
                console.error("❌ Database connection error:", dbError.message);
                console.warn("Will proceed without database updates");
                pool = null; // Don't try to use the pool anymore
            }
        } else {
            console.warn("⚠️ No database pool available - database updates will be skipped");
        }

        // Fetch data from the local endpoint
        console.log("Fetching tweets data from http://localhost:3000/createtiptoken...");
        const { data: tipData } = await axios.get("http://localhost:3000/createtiptoken");
        console.log(`Successfully fetched ${tipData.length} tweets to process.`);
        
        if (tipData.length === 0) {
            console.log("No tweets found to process. Exiting.");
            return;
        }
        
        for (const tip of tipData) {
            const { tweetId, tweetLinkExtra, amount } = tip;
            console.log(`\n--- Processing tweetId: ${tweetId} ---`);
            console.log(`Amount: ${amount}`);
            console.log(`📎 Extra Tweet Link Info: ${tweetLinkExtra || 'N/A'}`);
            
            try {
                // Create the TipLink and fund it
                console.log("Creating TipLink...");
                const tipResult = await createTipLinkWithFunds({ connection, payer, amount });
                
                console.log("✅ TipLink created successfully!");
                console.log("🌐 TipLink URL:", tipResult.url);
                console.log("📝 Transaction Signature:", tipResult.signature);
                
                // Verify the table structure and update the database
                if (pool) {
                    try {
                        // Check if the tweets1 table exists and has the expected structure
                        const tableCheck = await pool.query(`
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_name = 'tweets1'
                            );
                        `);
                        
                        if (!tableCheck.rows[0].exists) {
                            throw new Error("Table 'tweets1' does not exist");
                        }
                        
                        // Check if the 'tweet_id' column exists
                        const columnCheck = await pool.query(`
                            SELECT EXISTS (
                                SELECT FROM information_schema.columns 
                                WHERE table_name = 'tweets1' AND column_name = 'tweet_id'
                            );
                        `);
                        
                        if (!columnCheck.rows[0].exists) {
                            throw new Error("Column 'tweet_id' does not exist in table 'tweets1'");
                        }
                        
                        // Check if the record exists before updating
                        const recordCheck = await pool.query(
                            `SELECT COUNT(*) FROM tweets1 WHERE tweet_id = $1`,
                            [tweetId]
                        );
                        
                        if (parseInt(recordCheck.rows[0].count) === 0) {
                            console.log(`⚠️ No record found with tweet_id ${tweetId} in the tweets1 table`);
                            // Consider inserting a new record if appropriate
                            continue;
                        }
                        
                        // Now perform the update - FIXED: Parameter index from $3 to $1
                        const updateResult = await pool.query(
                            `UPDATE tweets1 SET action_perform = TRUE WHERE tweet_id = $1`,
                            [tweetId]
                        );
                        
                        console.log(`✅ Updated ${updateResult.rowCount} rows for tweetId ${tweetId}`);
                        
                    } catch (dbError) {
                        console.error(`❌ Database error for tweetId ${tweetId}:`, dbError.message);
                        // Log detailed error information for debugging
                        console.error("Error details:", dbError);
                    }
                } else {
                    console.log(`⚠️ Database update skipped for tweetId ${tweetId} - no pool available`);
                    console.log(`💡 TipLink was created successfully, but database was not updated`);
                    console.log(`🌐 TipLink URL: ${tipResult.url}`);
                    console.log(`📝 Transaction Signature: ${tipResult.signature}`);
                }
                
            } catch (err) {
                console.error(`❌ Error processing tweetId ${tweetId}:`, err.message);
            }
        }
    } catch (error) {
        console.error("FATAL ERROR: Unable to fetch or process tweets.", error.message);
    } finally {
        // Close the connection pool when done
        if (pool && typeof pool.end === 'function') {
            try {
                await pool.end();
                console.log("Database connection pool closed");
            } catch (error) {
                console.error("Error closing database connection pool:", error.message);
            }
        }
    }
})();