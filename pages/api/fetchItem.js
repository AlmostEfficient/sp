// This endpoint will send the user a file hash from IPFS
import products from "./products.json"

export default function fetchItem(req, res) {
  const { itemID } = req.body;
  
  if (!itemID) {
    res.status(400).send('Missing itemID');
  }
  const item = products.find(item => item.id === itemID);
  if (!item) {
    res.status(404).send('Item not found');
  }
  
  const hash = item.hash;
  const filename  = item.filename;
  res.status(200).json({ hash, filename });
}