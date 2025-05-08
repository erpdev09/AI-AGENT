const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


/*  Update here
the improve model would be 
--> to perform one txn in one go, and wait for one min
--> and then to update on the db from this code on higher level (if succesful--> update the action_perform)
--> we use a trigger code, that will call, the api, endpoint but that 
---> output doesn't define, but it's define by this main.js 

--> and then not to show any action_perform to /todoactivity once true
*/
const { swap } = require('../packages/wallet/swaptoken/swap');
const { searchTweets } = require('../twitter-scrapper/custom-scrapper/actionhandler/analyzetweet');
const { Connection, Keypair, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');
const spltokentransfer = require('../packages/wallet/transfertoken/soltoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Token address mapping for common tokens
const TOKEN_ADDRESSES = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'BERT': 'HgBRWfYxEfvPhtqkaeymCQtHCrKE46qQ43pKe8HCpump',
  'TRUMP': '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
  'RNDR': 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
  'PENGU':'2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
  'FART':'9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
};

// Load sender SOL private key (for SOL transfers)
const senderKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
if (!senderKeyBase58) throw new Error('Missing SOLANA_PRIVATE_KEY in .env');

let sender;
try {
  const secretKey = bs58.decode(senderKeyBase58);
  sender = Keypair.fromSecretKey(secretKey);
  console.log("✅ Loaded sender:", sender.publicKey.toBase58());
} catch (err) {
  throw new Error('Invalid SOLANA_PRIVATE_KEY format. It must be a base58 string.');
}


const connection = new Connection('https://api.mainnet-beta.solana.com');

// === SOL transfer route ===
app.get('/transfertoken/:amount/:recipient', async (req, res) => {
  const { amount, recipient } = req.params;

  try {
    const toPublicKey = new PublicKey(recipient);
    const amountSOL = parseFloat(amount);

    if (isNaN(amountSOL) || amountSOL <= 0) {
      const errorResponse = { error: 'Invalid amount' };
      console.log(errorResponse);
      return res.status(400).json(errorResponse);
    }

    const senderBalance = await connection.getBalance(sender.publicKey);
    const lamports = amountSOL * LAMPORTS_PER_SOL;

    if (senderBalance < lamports + 0.002 * LAMPORTS_PER_SOL) {
      const errorResponse = { error: 'Insufficient balance' };
      console.log(errorResponse);
      return res.status(400).json(errorResponse);
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );

    transaction.feePayer = sender.publicKey;

    const signature = await connection.sendTransaction(transaction, [sender]);

    const successResponse = {
      message: 'Transfer successful',
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };

    console.log(successResponse);
    res.json(successResponse);
  } catch (err) {
    console.error(err);
    const errorResponse = { error: 'Transfer failed', details: err.message };
    console.log(errorResponse);
    res.status(500).json(errorResponse);
  }
});

// === SPL Token transfer route ===
app.get('/api/sendspltoken/:contractaddress/:amount/:recipient', async (req, res) => {
  const { contractaddress, amount, recipient } = req.params;

  const privateKeyHex = process.env.SOLANA_PRIVATE_KEY; // should be stored securely
  if (!privateKeyHex) {
    return res.status(500).json({ error: 'PRIVATE_KEY is missing from .env' });
  }

  try {
    console.log(`⚙️  Initiating SPL Token Transfer`);
    await spltokentransfer(privateKeyHex, recipient, contractaddress, parseFloat(amount));
    const response = {
      message: 'SPL Token transfer initiated. Check logs for transaction status.',
    };
    console.log(response);
    res.json(response);
  } catch (err) {
    const errorResponse = { error: 'SPL token transfer failed', details: err.message };
    console.error(errorResponse);
    res.status(500).json(errorResponse);
  }
});

// === Swap SOL to token route ===
app.get('/swaptoken/:totoken/:foramount', async (req, res) => {
  const { totoken, foramount } = req.params;
  try {
    const txid = await swap({
      fromToken: "So11111111111111111111111111111111111111112", // SOL
      toToken: totoken,
      amount: parseFloat(foramount),
    });
    res.json({
      message: "Swap successful",
      txid,
      explorer: `https://solscan.io/tx/${txid}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Swap failed', details: err.message });
  }
});

// === Swap from any token to any token ===
app.get('/swaptoken/:from/:to/:amount', async (req, res) => {
  const { from, to, amount } = req.params;
  try {
    const txid = await swap({
      fromToken: from,
      toToken: to,
      amount: parseFloat(amount),
    });
    res.json({
      message: "Swap successful",
      txid,
      explorer: `https://solscan.io/tx/${txid}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Swap failed', details: err.message });
  }
});

/**
 * Resolves token symbol to address
 * @param {string} symbol - Token symbol (e.g. 'SOL', 'USDC')
 * @returns {string} - Token address or original input if not found in mapping
 */
function resolveTokenAddress(symbol) {
  // First normalize the input symbol by removing spaces and converting to uppercase
  const normalizedSymbol = symbol.replace(/\s+/g, '').toUpperCase();
  
  // Check if it's already an address (starts with a letter and is long)
  if (normalizedSymbol.length > 30 && /^[A-Za-z]/.test(normalizedSymbol)) {
    return normalizedSymbol; // Already an address
  }
  
  // Check in our token mapping
  if (TOKEN_ADDRESSES[normalizedSymbol]) {
    return TOKEN_ADDRESSES[normalizedSymbol];
  }
  
  // If we don't have a mapping, return the original value
  console.warn(`⚠️ Unknown token symbol: ${normalizedSymbol}`);
  return symbol;
}

/**
 * Check if an address is a valid Solana address
 * @param {string} address - Potential Solana address
 * @returns {boolean} - True if valid Solana address format
 */
function isValidSolanaAddress(address) {
  try {
    // Check that it's a valid public key format
    new PublicKey(address);
    // Additional check for length (Solana addresses are typically 32-44 characters)
    return address.length >= 32 && address.length <= 44;
  } catch {
    return false;
  }
}

/**
 * Execute the appropriate action based on tweet data
 * @param {Object} tweetData - Extracted data from tweet
 * @returns {Object} - Result of operation
 */
async function executeAction(tweetData) {
  try {
    const { keywords, contracts, tokenAmounts, symbols } = tweetData;
    const keywordsLower = keywords.map(k => k.toLowerCase());

    let recipient = contracts.find(contract => isValidSolanaAddress(contract));
    let amount = tokenAmounts?.find(a => !isNaN(parseFloat(a))) || null;
    amount = amount ? parseFloat(amount) : null;

    let fromToken = 'SOL';
    let toToken = null;

    if (symbols?.length) {
      if (symbols.length >= 2 && keywordsLower.includes('swap')) {
        fromToken = symbols[0];
        toToken = symbols[1];
      } else if (symbols.length === 1) {
        if (keywordsLower.includes('swap')) {
          toToken = symbols[0];
        } else if (keywordsLower.some(k => k === 'send' || k === 'transfer')) {
          fromToken = symbols[0];
        }
      }
    }

    const isSwap = keywordsLower.includes('swap');
    const isSend = keywordsLower.some(k => k === 'send' || k === 'transfer');

    if (isSwap) {
      const fromTokenAddress = resolveTokenAddress(fromToken);
      const toTokenAddress = resolveTokenAddress(toToken);

      if (!amount) amount = 0.1;

      console.log(`🔄 Swapping ${amount} from ${fromToken} → ${toToken}`);
      const txid = await swap({
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount,
      });

      return {
        action: 'swap',
        from: fromToken,
        to: toToken,
        amount,
        txid,
        explorer: `https://solscan.io/tx/${txid}`,
      };
    } else if (isSend && recipient) {
      const tokenAddress = resolveTokenAddress(fromToken);
      if (!amount) throw new Error('Missing amount for send');

      if (fromToken.toUpperCase() === 'SOL') {
        console.log(`💸 Sending ${amount} SOL to ${recipient}`);
        const toPublicKey = new PublicKey(recipient);
        const lamports = amount * LAMPORTS_PER_SOL;

        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: sender.publicKey,
            toPubkey: toPublicKey,
            lamports,
          })
        );
        tx.feePayer = sender.publicKey;
        const signature = await connection.sendTransaction(tx, [sender]);

        return {
          action: 'send',
          token: 'SOL',
          amount,
          recipient,
          signature,
          explorer: `https://explorer.solana.com/tx/${signature}?cluster=mainnet`,
        };
      } else {
        console.log(`🪙 Sending ${amount} ${fromToken} to ${recipient}`);
        await spltokentransfer(senderKeyBase58, recipient, tokenAddress, amount);

        return {
          action: 'send',
          token: fromToken,
          amount,
          recipient,
          message: 'SPL token transfer submitted',
        };
      }
    } else {
      throw new Error('Could not determine action (send/swap) from tweet keywords');
    }
  } catch (err) {
    console.error('❌ executeAction failed:', err);
    return { error: err.message };
  }

}

// === Semantic Search with Action Execution ===
app.get('/todoactivity', async (req, res) => {
  // Hardcoded query keywords
  const query = 'swap,send,buy,send,transfer';

  try {
    // Fetch and analyze tweets
    const results = await searchTweets(query);

    const formatted = results.map(tweet => ({
      content: tweet.content,
      user_name: tweet.user_name,
      tweet_id: tweet.tweet_id,
      tweet_link: tweet.tweet_link,
      tweet_link_extra: tweet.tweet_link_extra || null,
      created_at: tweet.created_at,
      distance: tweet._additional?.distance,
      extracted: {
        contracts: tweet.extracted.contracts || [],
        tokenAmounts: tweet.extracted.tokenAmounts || [],
        keywords: tweet.extracted.keywords || [],
        symbols: tweet.extracted.symbols || [],
      },
    }));

    // Process and filter formatted tweets that have contracts or relevant data
    const extractedData = processExtractedData(formatted);
    
    // Execute actions for each valid data point
    const actionsExecuted = await Promise.all(
      extractedData.map(async (item) => {
        // Skip items without enough data
        if (!item.keywords || item.keywords.length === 0) {
          return {
            original: item,
            status: 'skipped',
            reason: 'No keywords found'
          };
        }
        
        try {
          const result = await executeAction(item);
          return {
            original: item,
            result,
            status: result.error ? 'failed' : 'success'
          };
        } catch (err) {
          return {
            original: item,
            status: 'failed',
            error: err.message
          };
        }
      })
    );

    res.json({ 
      results: extractedData,
      actions: actionsExecuted
    });
  } catch (err) {
    console.error('Search or action execution error:', err);
    res.status(500).json({ error: 'Operation failed', details: err.message });
  }
});

// 🔍 Filtering and processing logic
function processExtractedData(data) {
  return data
    .map(item => ({
      tweet_link_extra: item.tweet_link_extra,
      content: item.content,
      contracts: item.extracted.contracts,
      tokenAmounts: item.extracted.tokenAmounts,
      keywords: item.extracted.keywords,
      symbols: item.extracted.symbols,
    }))
    .filter(item => {
      // Keep items with contracts (addresses)
      if (item.contracts && item.contracts.length > 0) return true;
      
      // Keep items with both symbols and amounts for swaps
      if (item.symbols && item.symbols.length > 0 && 
          item.tokenAmounts && item.tokenAmounts.length > 0) return true;
      
      // Otherwise filter out
      return false;
    });
}

app.listen(PORT, () => {
  console.log(`🚀 API listening at http://localhost:${PORT}`);
  console.log(`💱 Available token mappings: ${Object.keys(TOKEN_ADDRESSES).join(', ')}`);
});