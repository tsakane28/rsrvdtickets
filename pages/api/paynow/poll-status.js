import { Paynow } from "paynow";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pollUrl } = req.body;
    
    if (!pollUrl) {
      return res.status(400).json({ error: 'Missing poll URL' });
    }

    // Create Paynow instance
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Poll for transaction status
    const status = await paynow.pollTransaction(pollUrl);
    
    return res.status(200).json({
      paid: status.paid(),
      status: status.status,
      amount: status.amount,
      reference: status.reference
    });
  } catch (error) {
    console.error("Error polling transaction:", error);
    return res.status(500).json({ 
      error: error.message || 'An error occurred while polling the transaction' 
    });
  }
} 