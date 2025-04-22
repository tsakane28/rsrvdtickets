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

    console.log(`Polling Paynow transaction status from URL: ${pollUrl}`);

    // Create Paynow instance
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Set timeout for the poll request to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Paynow polling timed out after 15 seconds')), 15000)
    );
    
    // Race between the poll request and the timeout
    const status = await Promise.race([
      paynow.pollTransaction(pollUrl),
      timeoutPromise
    ]);
    
    // Log full response for debugging
    console.log('Paynow status response:', JSON.stringify(status));
    
    // Return the status directly, using the paid() method as shown in documentation
    return res.status(200).json({
      // This matches the documentation exactly - status.paid() is a method we need to call
      paid: status.paid ? status.paid() : false,
      status: status.status || 'unknown',
      amount: status.amount,
      reference: status.reference,
      // Include the raw status object for completeness
      rawStatus: status
    });
  } catch (error) {
    console.error("Error polling transaction:", error);
    return res.status(200).json({ 
      error: error.message || 'An error occurred while polling the transaction',
      paid: false
    });
  }
} 