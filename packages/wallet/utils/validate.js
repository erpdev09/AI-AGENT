const { Keypair } = require('@solana/web3.js');
const { Buffer } = require('buffer');
const privateKeyHex = '38a898a1d1498977434d74e7cb3eadea59392507c3dedd6640bc2d30c2830ab10bd421ca505bb75d57b690730541d0edaff632fa46c9f1df48b5677da0b85a3e';
const secretKeyBuffer = Buffer.from(privateKeyHex, 'hex');
const secretKeyUint8Array = new Uint8Array(secretKeyBuffer);
const keypair = Keypair.fromSecretKey(secretKeyUint8Array);
const secret = Array.from(keypair.secretKey);

console.log('Secret Key Array:', secret);