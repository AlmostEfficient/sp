import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
// import { createTransferCheckedInstruction, getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token"
import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
// import base58 from 'bs58';
import BigNumber from "bignumber.js";

// Import products.json from api folder
import products from "./products.json"

// Store's address, SOL tokens will be sent to them
const sellerAddress = new PublicKey('B1aLAAe4vW8nSQCetXnYqJfRxzTjnbooczwkUJAr7yMS')
const sellerPrivateKey = '5v8eEjTZjtED5B41QWkxeefaMsuXj2RL3h9q1TiS3vAWQALboyXVRxLN4cyd8jtnP8brdN8UFNoUs5ySpRW32yhA';

const usdcAddress = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')

// API endpoint to send back a tx that transfers 0.1 SOL to the store
// Gimme ur money hehe
export default async function createSolTransaction (req, res) {
  // console.log("Request received", req.body);
  try {
    const { buyer, orderID, itemID } = req.body; 

    // 400 if no sender wtf r u requesting dummy
    if (!buyer){
      res.status(400).json({
        message: "Missing buyer address"
      })
    }

    // Fetch item price from products.json using itemID
    const itemPrice = products.find(item => item.id === itemID).price;

    // If itemPrice is not found, return 404
    if (!itemPrice){
      res.status(404).json({
        message: "Item not found. please check item ID"
      })
    }
    const bigAmount = BigNumber(itemPrice);
    const buyerPublicKey = new PublicKey(buyer);
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    const connection  = new Connection(endpoint);
  
    const {blockhash} = await(connection.getLatestBlockhash('finalized'));

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: buyerPublicKey,
    })
    
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: buyerPublicKey,
      lamports: bigAmount.multipliedBy(LAMPORTS_PER_SOL).toNumber(),
      toPubkey: sellerAddress,
    })
  
    transferInstruction.keys.push({
      pubkey: new PublicKey(orderID),
      isSigner: false,
      isWritable: false,
    })
    
    tx.add(transferInstruction)

    const serializedTransaction = tx.serialize({
      requireAllSignatures: false
    })
  
    const base64 = serializedTransaction.toString('base64')

    res.status(200).json({
      transaction: base64
    })
  } catch (error) {
    console.error(error);

    res.status(500).json({error: 'error creating tx', })
    return
  }
}