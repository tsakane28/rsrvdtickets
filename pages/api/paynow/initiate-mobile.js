import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId, eventTitle, amount, email, name, phoneNumber, method } = req.body;
    
    if (!eventId || !eventTitle || !amount || !phoneNumber || !method) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`Initiating mobile payment for phone: ${phoneNumber}, method: ${method}`);
    
    // Create Paynow instance with provided integration details from environment variables
    const integrationId = process.env.PAYNOW_INTEGRATION_ID || "20667";
    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || "83c8858d-2244-4f0f-accd-b64e9f877eaa";
    const paynow = new Paynow(integrationId, integrationKey);
    
    // Generate a unique merchant reference for this payment
    const merchantReference = `ticket-${eventId}-${Date.now()}`;
    
    // Set return and result URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin || "https://rsrvdtickets.com";
    
    // Result URL - where Paynow sends webhook callbacks
    paynow.resultUrl = `${baseUrl}/api/paynow/update`;
    
    // Return URL - where user is redirected after payment, with query parameters as per Paynow guidelines
    paynow.returnUrl = `${baseUrl}/register/${eventId}/pending?gateway=paynow&merchantReference=${merchantReference}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
    
    console.log(`Setting mobile return URL: ${paynow.returnUrl}`);
    
    // Determine if we're in production mode
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In test mode, use merchant email; in production, use customer email
    const merchantEmail = process.env.MERCHANT_EMAIL || "wesleytsakane116@gmail.com";
    
    // Check if this is a test mode phone number - only applies in development
    let isTestNumber = false;
    let expectedBehavior = "";
    
    if (!isProduction) {
      if (phoneNumber === "0771111111") {
        isTestNumber = true;
        expectedBehavior = "SUCCESS - immediate approval (5 seconds)";
      } else if (phoneNumber === "0772222222") {
        isTestNumber = true;
        expectedBehavior = "DELAYED SUCCESS - approval after 30 seconds";
      } else if (phoneNumber === "0773333333") {
        isTestNumber = true;
        expectedBehavior = "FAILED - user cancelled after 30 seconds";
      } else if (phoneNumber === "0774444444") {
        isTestNumber = true;
        expectedBehavior = "FAILED - immediate insufficient balance error";
      }
      
      if (isTestNumber) {
        console.log(`TEST MODE: Using test phone number ${phoneNumber}. Expected behavior: ${expectedBehavior}`);
        
        // Enable test mode for development environment
        paynow.setTestMode(true);
      }
    }
    
    // Create payment with merchant reference and appropriate email
    const payment = paynow.createPayment(
      merchantReference, 
      isProduction ? email : merchantEmail
    );
    
    // Add ticket as item
    payment.add(`Ticket for ${eventTitle}`, parseFloat(amount));
    
    // Send mobile payment to Paynow
    console.log("Sending mobile payment to Paynow...");
    const response = await paynow.sendMobile(payment, phoneNumber, method);
    
    // Log the complete response for debugging
    console.log("Paynow mobile response:", JSON.stringify(response));
    
    if (response.success) {
      // Generate a unique ID for this payment
      const paymentId = `paynow-mobile-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Save payment information to the database
      const paymentRef = doc(db, "payments", paymentId);
      
      const paymentData = {
        eventId,
        eventTitle,
        email,
        name,
        amount: parseFloat(amount),
        phoneNumber,
        mobileMethod: method,
        reference: merchantReference,
        pollUrl: response.pollUrl,
        instructions: response.instructions,
        status: "pending",
        initiated: serverTimestamp(),
        method: "paynow-mobile",
        paymentId,
        returnUrl: paynow.returnUrl,
        merchantEmail: isProduction ? null : merchantEmail, // Only store in test mode
        isTestMode: isTestNumber && !isProduction, // Only true for test phone numbers in dev
        testBehavior: (isTestNumber && !isProduction) ? expectedBehavior : null,
        environment: process.env.NODE_ENV || 'development'
      };
      
      await setDoc(paymentRef, paymentData);
      
      // Add payment ID to the response
      response.paymentId = paymentId;
      response.merchantReference = merchantReference;
      
      // For test mode, add additional info to help with debugging
      if (isTestNumber && !isProduction) {
        response.isTestNumber = true;
        response.testBehavior = expectedBehavior;
      }
      
      // Add a log entry with payment information
      console.log(`Mobile payment initiated: ${paymentId}, Reference: ${merchantReference}, Phone: ${phoneNumber}, Method: ${method}, Amount: ${amount}, Environment: ${process.env.NODE_ENV}`);
    }
    
    // Directly pass through the Paynow response structure
    return res.status(200).json(response);
  } catch (error) {
    console.error("Paynow API error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An error occurred while processing the mobile payment' 
    });
  }
} 