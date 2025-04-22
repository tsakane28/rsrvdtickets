import { Paynow } from "paynow";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId, eventTitle, amount, email, name } = req.body;
    
    if (!eventId || !eventTitle || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create Paynow instance with provided integration details
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Set return and result URLs
    const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_BASE_URL;
    paynow.resultUrl = `${baseUrl}/api/paynow/update`;
    paynow.returnUrl = `${baseUrl}/api/paynow/return?event_id=${eventId}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
    
    // Create payment with event name as reference
    const payment = paynow.createPayment(`Ticket-${eventId}`);
    
    // Add ticket as item
    payment.add(`Ticket for ${eventTitle}`, parseFloat(amount));
    
    // Send payment to Paynow
    console.log("Sending payment to Paynow...");
    const response = await paynow.send(payment);
    
    // Log the complete response for debugging
    console.log("Paynow response:", JSON.stringify(response));
    
    // Directly pass through the Paynow response structure, which includes success, error, redirectUrl, pollUrl
    return res.status(200).json(response);
  } catch (error) {
    console.error("Paynow API error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An error occurred while processing the payment' 
    });
  }
} 