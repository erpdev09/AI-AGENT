// api.js
// --- Core Dependencies ---
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Ensure .env is loaded from parent directory

// --- Solana and Utility Dependencies ---
const {
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction // For simpler transactions
} = require('@solana/web3.js');
const bs58 = require('bs58');

// --- Project-Specific Modules ---
// Ensure these paths are correct relative to your api.js file
const { swap } = require('../packages/wallet/swaptoken/swap'); // For Jupiter swaps
const { searchTweets } = require('../twitter-scrapper/custom-scrapper/actionhandler/analyzetweet'); // Fetches tweets
const spltokentransfer = require('../packages/wallet/transfertoken/soltoken'); // For SPL token transfers

// --- Database and Local Modules ---
const { updateTweetActionStatus } = require('../helper/txn/updateTweetActionStatus'); // Assumes in the same directory
const pool = require('../config/dbconnect'); // Adjust path if your dbconnect.js is elsewhere

// --- Express App Initialization ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration & Constants ---
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
  'PENGU': '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
  'FART': '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
};
const DEFAULT_SLIPPAGE_BPS = 100; // 1% slippage for swaps

// --- Solana Connection & Sender Wallet Setup ---
const senderKeyBase58 = process.env.SOLANA_PRIVATE_KEY;
if (!senderKeyBase58) {
  console.error('FATAL ERROR: Missing SOLANA_PRIVATE_KEY in .env file. This is required to send transactions.');
  process.exit(1);
}

let sender;
try {
  const secretKey = bs58.decode(senderKeyBase58);
  sender = Keypair.fromSecretKey(secretKey);
  console.log("✅ Loaded sender wallet:", sender.publicKey.toBase58());
} catch (err) {
  console.error('FATAL ERROR: Invalid SOLANA_PRIVATE_KEY format. It must be a base58 string.', err);
  process.exit(1);
}

const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(solanaRpcUrl, 'confirmed');
console.log(`🔗 Connected to Solana RPC: ${solanaRpcUrl}`);

// === Helper Functions ===
function resolveTokenAddress(symbolOrAddress) {
  if (!symbolOrAddress) return null;

  const trimmedInput = String(symbolOrAddress).trim();
  const upperCaseSymbolKey = trimmedInput.toUpperCase(); 

  if (TOKEN_ADDRESSES[upperCaseSymbolKey]) {
    return TOKEN_ADDRESSES[upperCaseSymbolKey];
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedInput)) {
    try {
      new PublicKey(trimmedInput); 
      return trimmedInput; 
    } catch (e) {
      console.warn(`⚠️ resolveTokenAddress: Regex matched but PublicKey validation failed for: ${trimmedInput}`, e.message);
    }
  }
  console.warn(`⚠️ resolveTokenAddress: Unknown token symbol or invalid address: ${symbolOrAddress}`);
  return null;
}


function isValidSolanaAddress(address) {
  if (!address) return false;
  try {
    new PublicKey(address); 
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  } catch {
    return false;
  }
}

// === Direct API Routes (for testing or direct invocation) ===
app.get('/direct/transfertoken/:amount/:recipient', async (req, res) => {
  const { amount, recipient } = req.params;
  console.log(`DIRECT CALL: /transfertoken - Amount: ${amount}, Recipient: ${recipient}`);
  try {
    if (!isValidSolanaAddress(recipient)) {
      return res.status(400).json({ error: 'Invalid recipient address format.' });
    }
    const toPublicKey = new PublicKey(recipient);
    const amountSOL = parseFloat(amount);

    if (isNaN(amountSOL) || amountSOL <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
    }
    const lamports = amountSOL * LAMPORTS_PER_SOL;
    const senderBalance = await connection.getBalance(sender.publicKey);
    const estimatedFee = 5000;
    if (senderBalance < lamports + estimatedFee) {
      return res.status(400).json({ error: `Insufficient SOL balance. Have: ${senderBalance / LAMPORTS_PER_SOL} SOL.` });
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: toPublicKey,
        lamports,
      })
    );
    transaction.feePayer = sender.publicKey;
    const signature = await sendAndConfirmTransaction(connection, transaction, [sender]);
    const successResponse = {
      message: 'Direct SOL Transfer successful!',
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta`,
    };
    console.log(successResponse);
    res.json(successResponse);
  } catch (err) {
    console.error("Direct SOL Transfer Error:", err);
    res.status(500).json({ error: 'Direct SOL Transfer failed.', details: err.message, stack: err.stack });
  }
});

app.get('/direct/sendspltoken/:contractaddress/:amount/:recipient', async (req, res) => {
  const { contractaddress, amount, recipient } = req.params;
  console.log(`DIRECT CALL: /sendspltoken - Contract: ${contractaddress}, Amount: ${amount}, Recipient: ${recipient}`);

  if (!isValidSolanaAddress(contractaddress)) {
    return res.status(400).json({ error: 'Invalid SPL token contract address format.' });
  }
  if (!isValidSolanaAddress(recipient)) {
    return res.status(400).json({ error: 'Invalid recipient address format.' });
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
  }

  try {
    console.log(`⚙️  Initiating direct SPL Token Transfer: ${parsedAmount} of ${contractaddress} to ${recipient}`);
    const transferResult = await spltokentransfer(senderKeyBase58, recipient, contractaddress, parsedAmount);
    const response = {
      message: 'Direct SPL Token transfer initiated successfully.',
      details: transferResult 
    };
    console.log(response);
    res.json(response);
  } catch (err) {
    console.error("Direct SPL Token Transfer Error:", err);
    res.status(500).json({ error: 'Direct SPL token transfer failed.', details: err.message, stack: err.stack });
  }
});

app.get('/direct/swaptoken/sol-to/:totoken/:foramount', async (req, res) => {
  const { totoken, foramount } = req.params;
  console.log(`DIRECT CALL: /swaptoken/sol-to - To Token: ${totoken}, SOL Amount: ${foramount}`);

  const toTokenAddress = resolveTokenAddress(totoken);
  if (!toTokenAddress) {
    return res.status(400).json({ error: `Invalid or unknown 'to token': ${totoken}` });
  }
  const amountSOL = parseFloat(foramount);
  if (isNaN(amountSOL) || amountSOL <= 0) {
    return res.status(400).json({ error: 'Invalid SOL amount. Must be a positive number.' });
  }

  try {
    console.log(`Attempting direct swap: ${amountSOL} SOL to ${totoken} (${toTokenAddress})`);
    const txid = await swap({
      fromToken: TOKEN_ADDRESSES['SOL'],
      toToken: toTokenAddress,
      amount: amountSOL,
      userPublicKey: sender.publicKey.toBase58(),
      slippageBps: DEFAULT_SLIPPAGE_BPS
    });
    res.json({
      message: "Direct SOL to Token Swap successful!",
      txid,
      explorer: `https://solscan.io/tx/${txid}`
    });
  } catch (err) {
    console.error("Direct SOL to Token Swap Error:", err);
    res.status(500).json({ error: 'Direct SOL to Token Swap failed.', details: err.message, stack: err.stack });
  }
});

app.get('/direct/swaptoken/:from/:to/:amount', async (req, res) => {
  const { from, to, amount } = req.params;
  console.log(`DIRECT CALL: /swaptoken - From: ${from}, To: ${to}, Amount: ${amount}`);

  const fromTokenAddress = resolveTokenAddress(from);
  const toTokenAddress = resolveTokenAddress(to);

  if (!fromTokenAddress) return res.status(400).json({ error: `Invalid or unknown 'from token': ${from}` });
  if (!toTokenAddress) return res.status(400).json({ error: `Invalid or unknown 'to token': ${to}` });
  if (fromTokenAddress === toTokenAddress) return res.status(400).json({ error: 'From and To tokens cannot be the same.' });
  
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount. Must be a positive number.' });
  }

  try {
    console.log(`Attempting direct swap: ${parsedAmount} of ${from} (${fromTokenAddress}) to ${to} (${toTokenAddress})`);
    const txid = await swap({
      fromToken: fromTokenAddress,
      toToken: toTokenAddress,
      amount: parsedAmount,
      userPublicKey: sender.publicKey.toBase58(),
      slippageBps: DEFAULT_SLIPPAGE_BPS
    });
    res.json({
      message: "Direct Token to Token Swap successful!",
      txid,
      explorer: `https://solscan.io/tx/${txid}`
    });
  } catch (err) {
    console.error("Direct Token to Token Swap Error:", err);
    res.status(500).json({ error: 'Direct Token to Token Swap failed.', details: err.message, stack: err.stack });
  }
});

/**
 * Core logic to execute an action (swap or transfer) based on parsed tweet data.
 */
async function executeAction(tweetData) {
  const { keywords, contracts, tokenAmounts, symbols, tweet_link_extra, content } = tweetData;

  if (!tweet_link_extra) {
    console.error("❌ executeAction FATAL: tweet_link_extra is missing.", { content });
    return { error: 'Missing tweet_link_extra, cannot execute action.', status: 'failed', tweet_content: content };
  }

  console.log(`🎬 Attempting action for tweet: ${tweet_link_extra} - Content: "${content ? String(content).substring(0,70) : 'N/A'}..."`);

  try {
    const keywordsLower = (keywords || []).map(k => String(k).toLowerCase());
    const isSwap = keywordsLower.includes('swap');
    const isTransfer = keywordsLower.some(k => ['send', 'transfer'].includes(k));
    let actionResultPayload;

    const currentSymbols = (symbols || []).map(s => String(s));
    const currentContracts = (contracts || []).map(c => String(c)).filter(isValidSolanaAddress); 
    const currentTokenAmounts = (tokenAmounts || []).map(ta => parseFloat(String(ta))).filter(n => !isNaN(n) && n > 0);
    let primaryAmount = currentTokenAmounts.length > 0 ? currentTokenAmounts[0] : null;

    if (isSwap) {
      console.log(`🔍 Swap intent detected. Keywords: [${keywordsLower.join(', ')}], Symbols: [${currentSymbols.join(', ')}], Contracts: [${currentContracts.join(', ')}], Amounts: [${currentTokenAmounts.join(', ')}]`);
      let fromTokenAddress, toTokenAddress, amountForSwap, fromTokenSymbol, toTokenSymbol; 
      const hasSolKeyword = keywordsLower.some(k => k === 'sol' || k === '$sol' || k === 'solana');
      const hasForKeyword = keywordsLower.includes('for');

      // --- Priority 0: Specific "Swap [Amount] SOL for [TokenX]" or "Swap [TokenX] for [Amount] SOL" ---
      if (hasSolKeyword && hasForKeyword && primaryAmount) { // primaryAmount MUST be present for this pattern
        let targetTokenX_Identifier = null; 

        if (currentContracts.length === 1 && resolveTokenAddress(currentContracts[0]) !== TOKEN_ADDRESSES.SOL) {
          targetTokenX_Identifier = currentContracts[0];
        } else if (currentSymbols.length > 0) {
          const potentialTargetSymbol = currentSymbols.find(s => {
            const resolvedAddress = resolveTokenAddress(s);
            return resolvedAddress && resolvedAddress !== TOKEN_ADDRESSES.SOL;
          });
          if (potentialTargetSymbol) {
            targetTokenX_Identifier = potentialTargetSymbol;
          }
        }
        if (!targetTokenX_Identifier && currentContracts.length === 1 && currentContracts[0] !== TOKEN_ADDRESSES.SOL) {
            targetTokenX_Identifier = currentContracts[0];
        }

        if (targetTokenX_Identifier) {
          console.log(`♟️ Pattern 0: Specific SOL Swap. Target (TokenX): ${targetTokenX_Identifier}, SOL Amount: ${primaryAmount}`);
          fromTokenSymbol = 'SOL'; 
          fromTokenAddress = TOKEN_ADDRESSES.SOL;
          toTokenSymbol = targetTokenX_Identifier; 
          toTokenAddress = resolveTokenAddress(targetTokenX_Identifier); 
          amountForSwap = primaryAmount; // Use the explicitly found primaryAmount for SOL

          if (!toTokenAddress) throw new Error(`P0: Invalid target token for SOL swap: '${targetTokenX_Identifier}' could not be resolved.`);
          if (toTokenAddress === fromTokenAddress) throw new Error("P0: Target token for SOL swap cannot be SOL itself.");

          console.log(`🔄 Executing SWAP (P0: SOL for TokenX): ${amountForSwap} ${fromTokenSymbol} (${fromTokenAddress}) → ${toTokenSymbol} (${toTokenAddress})`);
          const txid = await swap({ fromToken: fromTokenAddress, toToken: toTokenAddress, amount: amountForSwap, userPublicKey: sender.publicKey.toBase58(), slippageBps: DEFAULT_SLIPPAGE_BPS });
          actionResultPayload = { action: 'swap_sol_for_tokenX', fromSymbol: fromTokenSymbol, toSymbol: toTokenSymbol, fromAddress: fromTokenAddress, toAddress: toTokenAddress, amount: amountForSwap, txid, explorer: `https://solscan.io/tx/${txid}` };
        }
      }

      // --- Priority 1: Two Symbols Present (and not the specific SOL swap above) ---
      if (!actionResultPayload && currentSymbols.length >= 2) {
        if (!primaryAmount) throw new Error("P1: Amount not specified for two-symbol swap."); // Require amount
        console.log(`♟️ Pattern 1: Two Symbols. Symbols: [${currentSymbols[0]}, ${currentSymbols[1]}]`);
        fromTokenSymbol = currentSymbols[0]; 
        toTokenSymbol = currentSymbols[1];   
        fromTokenAddress = resolveTokenAddress(fromTokenSymbol);
        toTokenAddress = resolveTokenAddress(toTokenSymbol);
        amountForSwap = primaryAmount; // Use the explicitly found primaryAmount

        if (!fromTokenAddress) throw new Error(`P1: Invalid 'from' token for Two-Symbol swap: '${fromTokenSymbol}' could not be resolved.`);
        if (!toTokenAddress) throw new Error(`P1: Invalid 'to' token for Two-Symbol swap: '${toTokenSymbol}' could not be resolved.`);
        if (fromTokenAddress === toTokenAddress) throw new Error("P1: Two-Symbol swap: From and To tokens are the same.");

        console.log(`🔄 Executing SWAP (P1: Two Symbols): ${amountForSwap} ${fromTokenSymbol} (${fromTokenAddress}) → ${toTokenSymbol} (${toTokenAddress})`);
        const txid = await swap({ fromToken: fromTokenAddress, toToken: toTokenAddress, amount: amountForSwap, userPublicKey: sender.publicKey.toBase58(), slippageBps: DEFAULT_SLIPPAGE_BPS });
        actionResultPayload = { action: 'swap_two_symbols', fromSymbol: fromTokenSymbol, toSymbol: toTokenSymbol, fromAddress: fromTokenAddress, toAddress: toTokenAddress, amount: amountForSwap, txid, explorer: `https://solscan.io/tx/${txid}` };
      }
      // --- Priority 2: Two Contract Addresses Present (and not caught by P0 or P1) ---
      else if (!actionResultPayload && currentContracts.length >= 2) {
        if (!primaryAmount) throw new Error("P2: Amount not specified for two-contract swap."); // Require amount
        console.log(`♟️ Pattern 2: Two Contracts. C1: ${currentContracts[0]}, C2: ${currentContracts[1]}`);
        fromTokenAddress = currentContracts[0]; 
        toTokenAddress = currentContracts[1];   
        fromTokenSymbol = currentContracts[0]; 
        toTokenSymbol = currentContracts[1];   
        amountForSwap = primaryAmount; // Use the explicitly found primaryAmount

        if (fromTokenAddress === toTokenAddress) throw new Error("P2: Two-Contract swap: From and To tokens are the same.");

        console.log(`🔄 Executing SWAP (P2: Two Contracts): ${amountForSwap} of ${fromTokenAddress} → ${toTokenAddress}`);
        const txid = await swap({ fromToken: fromTokenAddress, toToken: toTokenAddress, amount: amountForSwap, userPublicKey: sender.publicKey.toBase58(), slippageBps: DEFAULT_SLIPPAGE_BPS });
        actionResultPayload = { action: 'swap_two_contracts', fromSymbol: fromTokenSymbol, toSymbol: toTokenSymbol, fromAddress: fromTokenAddress, toAddress: toTokenAddress, amount: amountForSwap, txid, explorer: `https://solscan.io/tx/${txid}` };
      }
      // --- Priority 3: One Symbol (non-SOL) or One Contract (implying SOL to Token, and not caught by P0) ---
      else if (!actionResultPayload &&
               ((currentSymbols.length === 1 && resolveTokenAddress(currentSymbols[0]) !== TOKEN_ADDRESSES.SOL) ||
                (currentContracts.length === 1 && currentContracts[0] !== TOKEN_ADDRESSES.SOL))) {
        
        if (!primaryAmount) throw new Error("P3: Amount not specified for SOL to single target swap."); // Require amount
        let targetIdentifier;
        if (currentSymbols.length === 1 && resolveTokenAddress(currentSymbols[0]) !== TOKEN_ADDRESSES.SOL) {
            targetIdentifier = currentSymbols[0];
        } else if (currentContracts.length === 1 && currentContracts[0] !== TOKEN_ADDRESSES.SOL) {
            targetIdentifier = currentContracts[0];
        } else {
             throw new Error("P3: Ambiguous single target for SOL swap.");
        }

        console.log(`♟️ Pattern 3: SOL to Single Target. Target: ${targetIdentifier}`);
        
        fromTokenAddress = TOKEN_ADDRESSES.SOL;
        fromTokenSymbol = 'SOL'; 
        toTokenAddress = resolveTokenAddress(targetIdentifier); 
        toTokenSymbol = targetIdentifier; 
        amountForSwap = primaryAmount; // Use the explicitly found primaryAmount (interpreted as SOL amount here)

        if (!toTokenAddress) throw new Error(`P3: Invalid target token for SOL to Single Target swap: '${targetIdentifier}' could not be resolved.`);
        if (fromTokenAddress === toTokenAddress) throw new Error("P3: SOL to Single Target swap: Target token is SOL itself.");
        
        console.log(`🔄 Executing SWAP (P3: SOL to Single Target): ${amountForSwap} SOL → ${toTokenSymbol} (${toTokenAddress})`);
        const txid = await swap({ fromToken: fromTokenAddress, toToken: toTokenAddress, amount: amountForSwap, userPublicKey: sender.publicKey.toBase58(), slippageBps: DEFAULT_SLIPPAGE_BPS });
        actionResultPayload = { action: 'swap_sol_to_single_target', fromSymbol: fromTokenSymbol, toSymbol: toTokenSymbol, fromAddress: fromTokenAddress, toAddress: toTokenAddress, amount: amountForSwap, txid, explorer: `https://solscan.io/tx/${txid}` };
      }

      if (!actionResultPayload) {
        let reason = `Swap conditions not met after all checks. Symbols: [${currentSymbols.join(',')}], Contracts: [${currentContracts.join(',')}], SOL Keyword: ${hasSolKeyword}, For Keyword: ${hasForKeyword}, Amount: ${primaryAmount}.`;
        throw new Error(`Ambiguous swap request or insufficient data. ${reason}`);
      }

    } else if (isTransfer) {
      const recipient = currentContracts[0];
      if (!recipient) throw new Error("Transfer failed: Recipient address missing or invalid.");
      
      if (!primaryAmount) throw new Error("Transfer failed: Amount not specified."); // Require amount for transfers too
      let amountForTransfer = primaryAmount;
      let tokenToTransferSymbol = 'SOL'; 

      if (currentSymbols.length > 0 && resolveTokenAddress(currentSymbols[0]) !== TOKEN_ADDRESSES.SOL) { 
          tokenToTransferSymbol = currentSymbols[0];
      }

      if (tokenToTransferSymbol.toUpperCase() === 'SOL' || resolveTokenAddress(tokenToTransferSymbol) === TOKEN_ADDRESSES.SOL) {
        console.log(`💸 Executing SOL TRANSFER: ${amountForTransfer} SOL → ${recipient}`);
        const toPublicKey = new PublicKey(recipient);
        const lamports = amountForTransfer * LAMPORTS_PER_SOL;
        const senderBalance = await connection.getBalance(sender.publicKey);
        if (senderBalance < lamports + 5000) {
          throw new Error(`Insufficient SOL for transfer: ${amountForTransfer} SOL.`);
        }
        const transaction = new Transaction().add(SystemProgram.transfer({ fromPubkey: sender.publicKey, toPubkey: toPublicKey, lamports }));
        const signature = await sendAndConfirmTransaction(connection, transaction, [sender]);
        actionResultPayload = { action: 'transfer_sol', tokenSymbol: 'SOL', amount: amountForTransfer, recipient, signature, explorer: `https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta` };
      } else {
        const tokenAddressToTransfer = resolveTokenAddress(tokenToTransferSymbol);
        if (!tokenAddressToTransfer) throw new Error(`Invalid SPL token for transfer: '${tokenToTransferSymbol}' could not be resolved.`);

        console.log(`💸 Executing SPL TOKEN TRANSFER: ${amountForTransfer} ${tokenToTransferSymbol}(${tokenAddressToTransfer}) → ${recipient}`);
        const splResult = await spltokentransfer(senderKeyBase58, recipient, tokenAddressToTransfer, amountForTransfer);
        actionResultPayload = { action: 'transfer_spl_token', tokenSymbol: tokenToTransferSymbol, tokenAddress: tokenAddressToTransfer, amount: amountForTransfer, recipient, details: splResult, message: 'SPL Token transfer initiated.' };
      }
    } else {
      throw new Error('Could not determine valid action (swap/transfer) from tweet keywords.');
    }

    if (!actionResultPayload) {
        throw new Error("Internal error: Action payload not generated after processing.");
    }

    const dbUpdateSuccess = await updateTweetActionStatus(tweet_link_extra);
    actionResultPayload.dbStatus = dbUpdateSuccess ? "updated_successfully" : "update_failed";
    
    console.log(`✅ Action successful for ${tweet_link_extra}. DB Status: ${actionResultPayload.dbStatus}`);
    return { ...actionResultPayload, status: 'success', tweet_content: content, tweet_link_extra };

  } catch (error) {
    console.error(`❌ Action execution FAILED for tweet ${tweet_link_extra}: ${error.message}`);
    return { error: error.message, status: 'failed', tweet_content: content, tweet_link_extra, stack: error.stack };
  }
}

// === Main Tweet Processing Route: /todoactivity ===
app.get('/todoactivity', async (req, res) => {
  const queryKeywords = 'swap,send,buy,transfer,airdrop';

  try {
    console.log(`\n🔄 [${new Date().toISOString()}] Starting /todoactivity cycle...`);
    console.log("1. Fetching tweets from scrapper with keywords:", queryKeywords);
    const rawTweets = await searchTweets(queryKeywords);

    if (!rawTweets || rawTweets.length === 0) {
      console.log("🔵 No tweets found from scrapper in this cycle.");
      return res.json({ message: "No new tweets found from scrapper.", processed_count: 0, actions: [] });
    }
    console.log(`📰 Found ${rawTweets.length} raw tweets from scrapper.`);
    
    const tweetLinksToCheck = rawTweets.map(tweet => tweet.tweet_link_extra).filter(link => !!link);
    if (tweetLinksToCheck.length === 0) {
      console.log("🔵 None of the raw tweets had 'tweet_link_extra'. Cannot check DB status.");
      return res.json({ message: "No tweets with 'tweet_link_extra' found to process.", processed_count: 0, actions: [] });
    }

    console.log(`2. Checking DB status for ${tweetLinksToCheck.length} tweet links...`);
    const dbQuery = `SELECT tweet_link_extra FROM tweets1 WHERE tweet_link_extra = ANY($1::text[]) AND action_perform = TRUE`;
    const dbResult = await pool.query(dbQuery, [tweetLinksToCheck]);
    
    const alreadyPerformedLinks = new Set(dbResult.rows.map(row => row.tweet_link_extra));
    console.log(`ℹ️ ${alreadyPerformedLinks.size} tweets are already marked as action_perform=TRUE.`);

    const actionableTweets = rawTweets.filter(tweet => tweet.tweet_link_extra && !alreadyPerformedLinks.has(tweet.tweet_link_extra));

    if (actionableTweets.length === 0) {
      console.log("✅ All fetched tweets have already been processed or lacked 'tweet_link_extra'.");
      return res.json({ message: "No new actionable tweets requiring processing.", processed_count: 0, actions: [] });
    }
    console.log(`3. Found ${actionableTweets.length} new actionable tweets to process.`);

    const formattedTweets = actionableTweets.map(tweet => ({
      content: String(tweet.content || ""), 
      user_name: String(tweet.user_name || "UnknownUser"),
      tweet_id: String(tweet.tweet_id || "UnknownID"),
      tweet_link: String(tweet.tweet_link || ""),
      tweet_link_extra: String(tweet.tweet_link_extra || ""),
      created_at: tweet.created_at,
      distance: tweet._additional?.distance,
      contracts: (tweet.extracted?.contracts || []).map(c => String(c)),
      tokenAmounts: (tweet.extracted?.tokenAmounts || []).map(ta => String(ta)),
      keywords: (tweet.extracted?.keywords || []).map(k => String(k)),
      symbols: (tweet.extracted?.symbols || []).map(s => String(s)),
    }));

    console.log("4. Filtering and structuring data for action execution (using processExtractedData)...");
    const extractedData = processExtractedData(formattedTweets);
    
    if (extractedData.length === 0) {
      console.log("🔵 No tweets passed the 'processExtractedData' filter.");
      return res.json({ message: "No tweets met criteria for action after internal filtering.", processed_count: 0, actions: [] });
    }
    console.log(`🛠️ ${extractedData.length} tweets structured for potential action.`);

    console.log("5. Executing actions one by one...");
    const actionsExecutedResults = [];
    for (const item of extractedData) { 
        console.log(`--- Processing item for tweet: ${item.tweet_link_extra} ---`);
        try {
            const result = await executeAction(item);
            actionsExecutedResults.push(result); 
        } catch (execError) {
            console.error(`🚨 CRITICAL error during executeAction call for ${item.tweet_link_extra}: ${execError.message}`);
            actionsExecutedResults.push({ original_tweet_content: item.content, tweet_link_extra: item.tweet_link_extra, status: 'failed', error: `Outer exec error: ${execError.message}`, stack: execError.stack });
        }
    }
    
    console.log("✅ /todoactivity cycle finished.");
    res.json({
      message: `Processed ${extractedData.length} potential actions. See 'actions' array for details.`,
      processed_count: extractedData.length,
      actions: actionsExecutedResults,
    });

  } catch (err) {
    console.error('🚨 FATAL ERROR in /todoactivity route:', err);
    res.status(500).json({ error: 'Overall operation failed in /todoactivity', details: err.message, stack: err.stack });
  }
});

function processExtractedData(formattedTweets) {
  return formattedTweets
    .map(item => ({
      tweet_link_extra: item.tweet_link_extra,
      content: item.content,
      contracts: item.contracts || [],
      tokenAmounts: item.tokenAmounts || [],
      keywords: item.keywords || [],
      symbols: item.symbols || [],
    }))
    .filter(item => {
      if (!item.tweet_link_extra) {
        console.warn("Filtering out item in processExtractedData: missing tweet_link_extra. Content:", String(item.content).substring(0,50));
        return false;
      }
      const hasActionKeyword = item.keywords && item.keywords.some(k => ['swap', 'send', 'transfer'].includes(String(k).toLowerCase()));
      const hasSwapIndicators = item.symbols && item.symbols.length > 0 && item.tokenAmounts && item.tokenAmounts.length > 0; // Crucial: require amounts for swaps
      const hasContractInfo = item.contracts && item.contracts.length > 0;
      const hasTransferInfo = item.tokenAmounts && item.tokenAmounts.length > 0 && item.contracts && item.contracts.length > 0;


      if (hasActionKeyword && (hasSwapIndicators || hasContractInfo || hasTransferInfo)) { // Ensure some data exists for the action
        return true;
      }
      return false;
    });
}


app.get('/todoactivity/createtoken', async (req, res) => {
  try {
    const keyword = 'create a token';
    const query = `
      SELECT * FROM tweets1
      WHERE LOWER(tweet_content) LIKE $1
    `;
    const values = [`%${keyword.toLowerCase()}%`];

    const dbRes = await pool.query(query, values);

    if (dbRes.rows.length === 0) {
      res.status(404).json({ message: 'No matching tweets found.' });
    } else {
      const extractedData = dbRes.rows.map(row => {
        const content = row.tweet_content;

        const nameMatch = content.match(/name\s*=\s*["'](.+?)["']/i);
        const descMatch = content.match(/description\s*=\s*["'](.+?)["']/i);
        const websiteMatch = content.match(/website\s*=\s*["'](.+?)["']/i);
        const telegramMatch = content.match(/telegram\s*=\s*["'](.+?)["']/i);
        const liquidityMatch = content.match(/initial\s+liquidity\s*=\s*["'](.+?)["']/i);
         const imageurl = content.match(/Image\s+link\s*[:=]\s*["']?(.+?)["']?(?:\s|$)/i);


        return {
          tweetid: row.tweet_id,
          name: nameMatch ? nameMatch[1] : 'N/A',
          description: descMatch ? descMatch[1] : 'N/A',
          website: websiteMatch ? websiteMatch[1] : 'N/A',
          telegram: telegramMatch ? telegramMatch[1] : 'N/A',
          initial_liquidity: liquidityMatch ? liquidityMatch[1] : 'N/A',
          imageurl: imageurl ? imageurl[1] : 'N/A',
        };
      });

      res.status(200).json(extractedData);
    }
  } catch (err) {
    console.error('Error querying tweets:', err);
    res.status(500).json({ error: 'Internal server error while fetching tweets.' });
  } finally {
    // In a typical Express app, you don't close the pool here.
    // The pool should remain open for the lifetime of the application.
    // Closing it here would prevent future requests from working.
    // If this is a serverless function or a script meant to run and exit,
    // you might handle connection closing differently.
  }
});


app.get('/createnft', async (req, res) => {
  try {
    const keyword = 'create a nft from this image';
    const query = `
      SELECT tweet_id, tweet_content, action_perform FROM tweets1
      WHERE LOWER(tweet_content) LIKE $1 AND action_perform = FALSE
    `;
    const values = [`%${keyword.toLowerCase()}%`];

    const dbRes = await pool.query(query, values);

    if (dbRes.rows.length === 0) {
      return res.json({ message: 'No matching tweets found.', data: [] });
    }

    const extracted = [];

    dbRes.rows.forEach((row) => {
      const { tweet_id, tweet_content } = row;

      const match = tweet_content.match(/name\s*=\s*['"]?([^'"]+)['"]?\s+.*?supply\s*=\s*['"]?([^'"]*)['"]?/i);

      if (match) {
        const name = match[1].trim();
        const supplyRaw = match[2].trim();
        const supplyMatch = supplyRaw.match(/\d+/);
        const finalSupply = supplyMatch ? supplyMatch[0] : null;

        if (finalSupply) {
          extracted.push({
            tweet_id,
            name,
            supply: finalSupply
          });
        }
      }
    });

    if (extracted.length === 0) {
      return res.json({ message: '❌ No tweets with both name and supply parameters found.', data: [] });
    }

    return res.json({ message: '✅ Tweets extracted successfully.', data: extracted });
  } catch (err) {
    console.error('❌ Error querying tweets:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`🚀 API server listening at http://localhost:${PORT}`);
  console.log("🔑 Sender Wallet Public Key:", sender.publicKey.toBase58());
});