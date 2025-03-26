Token-Swap-Jupiter
==================

Jupiter Trading Bot
-------------------

A trading bot designed to interact with the Jupiter aggregator on the Solana blockchain. This bot enables efficient token swaps and trading on the Solana network using the Jupiter API.

Features
--------

-   **Token Swapping**: Utilizes the Jupiter API for performing token swaps between SPL tokens.
-   **Solana Blockchain Integration**: Employs Solana's Web3 and SPL token libraries for blockchain interactions.
-   **TypeScript**: Written in TypeScript for enhanced development experience and type safety.

Installation
------------

1.  **Clone the Repository**:





    `git clone <repository-url>
    cd jupiter-trading-bot`

2.  **Install Dependencies**:

   

    `npm install`

3.  **Ensure Node.js is Installed**: Make sure you have Node.js installed on your system.

Usage
-----

To start the bot, use the following command:



`npx ts-node index.ts`

Dependencies
------------

-   `@jup-ag/api`: Jupiter API for interacting with the Solana decentralized exchange.
-   `@solana/spl-token`: Solana SPL Token library for handling token operations.
-   `@solana/web3.js`: Solana Web3 library for blockchain interactions.
-   `dotenv`: Loads environment variables from a `.env` file.
-   `ts-node`: TypeScript execution environment for Node.js.
-   `typescript`: TypeScript language support.

Configuration
-------------

1.  **Create a `.env` File**: Add your environment variables in a `.env` file in the root directory of your project. Example:

    env

  

    `SOLANA_RPC_URL=<your-solana-rpc-url>
    JUPITER_API_KEY=<your-jupiter-api-key>`

2.  **Update `index.ts`**: Ensure that `index.ts` is configured to use your environment variables.
