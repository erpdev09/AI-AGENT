const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_LIST_URL = 'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';

// Global variable to store the loaded token list data
let tokenListData = null;
let isTokenListLoaded = false;

// --- Function to Load Token List ---
async function loadTokenList() {
    try {
        // Dynamically import node-fetch (for v3+) inside the async function
        // If using node-fetch v2 and require, ensure fetch is defined in this scope
        const { default: fetch } = await import('node-fetch');

        console.log(`Attempting initial fetch from: ${TOKEN_LIST_URL}`);
        const response = await fetch(TOKEN_LIST_URL);

        if (!response.ok) {
            throw new Error(`Failed to fetch token list: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Basic validation of the structure
        if (!data || !Array.isArray(data.tokens)) {
             throw new Error('Fetched data does not contain a valid `tokens` array.');
        }

        tokenListData = data; // Store the successfully parsed data
        isTokenListLoaded = true;
        console.log(`Successfully loaded and cached ${tokenListData.tokens.length} tokens.`);

    } catch (error) {
        console.error("--------------------------------------------------");
        console.error("FATAL: Failed to load initial token list on startup.");
        console.error("Error:", error.message);
        console.error("The /token-address endpoint will not function correctly.");
        console.error("--------------------------------------------------");
        tokenListData = null; // Ensure it's null if loading failed
        isTokenListLoaded = false;
        // Optional: You could exit the process if the list is critical
        // process.exit(1);
    }
}

// --- API Endpoint ---
app.get('/token-address', (req, res) => { // This handler no longer needs to be async
    const { symbol } = req.query;

    if (!symbol) {
        return res.status(400).json({ error: 'Missing `symbol` query parameter' });
    }

    // Check if the token list was loaded successfully at startup
    if (!isTokenListLoaded || !tokenListData) {
        // Use 503 Service Unavailable if the data isn't ready
        return res.status(503).json({ error: 'Token list data is not available. Server initialization might have failed.' });
    }

    try {
        // Search the in-memory list (case-insensitive)
        const token = tokenListData.tokens.find(
            (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
        );

        if (!token) {
            return res.status(404).json({ error: `Token with symbol '${symbol}' not found in cached list` });
        }

        // Return data from the cached list
        return res.json({ address: token.address, name: token.name, symbol: token.symbol });

    } catch (error) {
         // Catch potential errors during the find operation (less likely, but safe)
         console.error('Error searching cached token list:', error);
         return res.status(500).json({ error: 'Internal server error while searching token list.' });
    }
});

// --- Start Server Function ---
async function startServer() {
    // Load the token list BEFORE starting the listener
    await loadTokenList();

    // Start listening for requests
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
        if (!isTokenListLoaded) {
             console.warn("WARNING: Server started, but initial token list failed to load. /token-address will return errors.");
        }
    });
}

// --- Initialize ---
startServer(); // Call the function to load data and then start the server