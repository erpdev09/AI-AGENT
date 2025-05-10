# Solana Rug Pull Checker

A rug pull detection script in Solana with a scoring feature that helps determine a token's legitimacy. It uses Solana web3.js, Raydiyum SDK, Helius API, and Dexscreener API for marketdata. It tracks the following indicators:

1. Top holders percentage
2. Individual holders percentage
3. Honeypot
4. Liquidity check
5. Minting functionality
6. Mutablity of metadata
7. Freezing of contract
8. Ownership revocation
9. Websites check
10. Pump.fun website check (This website supports creating rug tokens. If a token is present in this website, it's likely a rug)

## Steps to install the script

1. Clone/fork the repo. `npm install` or use anyother package installer like `yarn install`
2. Setup `.env` with `SOLANA_RPC_SOLANA_RPC_ENDPOINT="https://solana-mainnet.core.chainstack.com/9106xxxxx"` and `HELIUS_API_KEY="123456-7890-xxxx"`.
3. Build the Typescript files by running the following command `npm run build`.
4. Use `node index.js` to run the script. Input the address of the token and it will return Metadata, rug score, marketdata, and other indicators.

### Rug Score

The rug score is determined by weighing all the features combined. If a token is below a score of 400, it's likely safe. 
