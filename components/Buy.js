/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from 'react';
import { Keypair, Transaction, Connection } from "@solana/web3.js"
import { findReference, FindReferenceError } from '@solana/pay';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { InfinitySpin } from 'react-loader-spinner';
import IPFSDownload from '../components/Ipfsdownload';

export default function Buy({itemID}){
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const orderID = useMemo(()=> Keypair.generate().publicKey, []); // Public key used to identify the order
  
  const [tx, setTx] = useState(null);               // Transaction object for buyer to sign

  // TODO move these to a single status with a switch statement
  const [submitted, setSubmitted] = useState(false);// Transaction signed & sent to nodes
  const [paid, setPaid] = useState(false);          // Transaction confirmed by blockchain
  const [item, setItem] = useState(null);           // IPFS hash & filename of the purchased item
  
  const [loading, setLoading] = useState(false);    // Loading state of all above
  
  // Create order object using publicKey, orderID, and itemID with useMemo
  const order = useMemo(()=> ({
    buyer: publicKey.toString(),
    orderID: orderID.toString(),
    itemID: itemID,
  }), [publicKey, orderID, itemID]);

  // Fetch the transaction object from the server (done to avoid tampering)
  async function getTransaction() { 
    setLoading(true);
    const txResponse = await fetch('../api/createTransaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order),
    })
    const txData = await txResponse.json();

     // eslint-disable-next-line no-undef
    const tx = Transaction.from(Buffer.from(txData.transaction, 'base64'));
    setTx(tx);
    setLoading(false);
  }

  // Run by useEffect when tx is changed
  async function trySendTransaction(){
    setLoading(true);
    if (!tx) {
      return;
    }

    try {
      const txHash = await sendTransaction(tx, connection)
      console.log(`Transaction sent: https://solscan.io/tx/${txHash}?cluster=devnet`);
      setSubmitted(true);
    } catch (error) {
      console.error(error)
    } 
    setLoading(false);
  }

  // Fetch the item hash from products.json
  async function fetchItem() {
    const response = await fetch('../api/fetchItem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        },
      body: JSON.stringify(order),
    })
    const json = await response.json();
    setItem(json);
  }

  async function addOrder() {
    console.log("adding order ", order, "To DB");
    const response = await fetch('../api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        },
      body: JSON.stringify(order),
    })
  }

  useEffect(()=>{
    // Check if this address already has already purchased this item
    // If so, fetch the item and set paid to true

    async function checkOrder() {
      // Send a GET request with the public key as a parameter
      const response = await fetch(`../api/orders?buyer=${publicKey.toString()}`);
      // If response code is 200
      if (response.status === 200) {
        const json = await response.json();
        console.log("Current wallet's orders are:", json);
        // If orders is not empty
        if (json.length > 0) {
          // Check if there are any records with this buyer and item ID
          const order = json.find((order) => order.buyer === publicKey.toString() && order.itemID === itemID);
          if (order) {
            setPaid(true);
            fetchItem();
          }
        }
      }
    }
    checkOrder();
  }, [publicKey, itemID])

  useEffect(() => {
    trySendTransaction()
  }, [tx])
  
  useEffect(() => {
    // Check if transaction was confirmed
    if(submitted){
      setLoading(true);
      const interval = setInterval(async () => {
        try {
          const result = await findReference(connection, orderID);
          console.log("Finding tx reference", result.confirmationStatus);
          if (result.confirmationStatus === "finalized") {
            setPaid(true);
            addOrder();
            clearInterval(interval);
            setLoading(false);
          }
        } catch (e) {
          if (e instanceof FindReferenceError) {
            return null;
          }
          console.error('Unknown error', e);
        }
      }, 500);
      return () => {
        clearInterval(interval)
      }
    }
    setLoading(false);
  }, [submitted]);

  useEffect(() => {
    if(paid){
      fetchItem()
    }
  }, [paid]);


  if (!publicKey) {
    return (
      <div>
        <p>You need to connect your wallet to make transactions</p>
      </div>
    )
  } 

  if (loading) {
    return <InfinitySpin color="gray" />
  }

  return (
    <div>
      {/* Display either buy button or IPFSDownload component based on if Hash exists */}
      {item ? (
        <IPFSDownload hash={item.hash} filename={item.filename} />
      ) : (
        <button disabled={loading} className="cta-button connect-wallet-button" onClick={getTransaction}>
          Buy
        </button>
      )}
    </div>
  );
}