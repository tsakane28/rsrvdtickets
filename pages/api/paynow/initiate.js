import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
    
    // Generate a unique merchant reference for this payment
    const merchantReference = `ticket-${eventId}-${Date.now()}`;
    
    // Set return and result URLs
    const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_BASE_URL || "https://rsrvdtickets.vercel.app";
    
    // Result URL - where Paynow sends webhook callbacks
    paynow.resultUrl = `${baseUrl}/api/paynow/update`;
    
    // Return URL - where user is redirected after payment, with query parameters as per Paynow guidelines
    paynow.returnUrl = `${baseUrl}/register/${eventId}/pending?gateway=paynow&merchantReference=${merchantReference}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
    
    console.log(`Setting return URL: ${paynow.returnUrl}`);
    
    // Important: For test mode, include the merchant email as authemail
    // This allows test transactions to be completed as per Paynow docs
    const merchantEmail = process.env.MERCHANT_EMAIL || "wesleytsakane116@gmail.com"; // Replace with your merchant email
    
    // Create payment with merchant reference and merchant email (for test mode)
    // The second parameter is the authemail field required for test mode
    const payment = paynow.createPayment(merchantReference, merchantEmail);
    
    // Add ticket as item
    payment.add(`Ticket for ${eventTitle}`, parseFloat(amount));
    
    // Send payment to Paynow
    console.log("Sending payment to Paynow...");
    const response = await paynow.send(payment);
    
    // Log the complete response for debugging
    console.log("Paynow response:", JSON.stringify(response));
    
    if (response.success) {
      // Generate a unique ID for this payment
      const paymentId = `paynow-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Save payment information to the database
      const paymentRef = doc(db, "payments", paymentId);
      await setDoc(paymentRef, {
        eventId,
        eventTitle,
        email,
        name,
        amount: parseFloat(amount),
        reference: merchantReference,
        pollUrl: response.pollUrl,
        redirectUrl: response.redirectUrl,
        status: "pending",
        initiated: serverTimestamp(),
        method: "paynow-web",
        paymentId,
        returnUrl: paynow.returnUrl,
        merchantEmail: merchantEmail, // Store this for reference
        isTestMode: true // Flag to indicate this is a test payment
      });
      
      // Add payment ID to the response
      response.paymentId = paymentId;
      response.merchantReference = merchantReference;
    }
    
    // Directly pass through the Paynow response structure
    return res.status(200).json(response);
  } catch (error) {
    console.error("Paynow API error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An error occurred while processing the payment' 
    });
  }
} 