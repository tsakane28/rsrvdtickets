import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract payment information from request
    const { amount, email, name, eventId, phone, testMode, testBehavior } = req.body;
    
    if (!amount || !email || !name || !eventId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create timestamp for reference
    const timestamp = Date.now();
    const reference = `ticket-${eventId}-${timestamp}`;
    
    // Create a new Paynow instance
    // ID: 20667, Integration Key: 83c8858d-2244-4f0f-accd-b64e9f877eaa
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Enable test mode if specified
    if (testMode === true) {
      paynow.setResultUrl(`${process.env.NEXT_PUBLIC_SITE_URL}/api/paynow/update`);
      paynow.setReturnUrl(`${process.env.NEXT_PUBLIC_SITE_URL}/events/${eventId}/checkout/status?reference=${reference}`);
    } else {
      paynow.setResultUrl(`${process.env.NEXT_PUBLIC_SITE_URL}/api/paynow/update`);
      paynow.setReturnUrl(`${process.env.NEXT_PUBLIC_SITE_URL}/events/${eventId}/checkout/status?reference=${reference}`);
    }
    
    // Create a new payment
    let payment = paynow.createPayment(reference, email);
    
    // Add the ticket item to the payment
    payment.add("Event Ticket", parseFloat(amount));
    
    // Generate a unique ID for the payment document
    const paymentId = uuidv4();
    
    // Additional test mode configuration
    let isTestMode = false;
    let testConfig = null;
    
    if (testMode === true) {
      isTestMode = true;
      testConfig = {
        testBehavior: testBehavior || 'immediate-success', // Default to immediate-success
        initiatedAt: serverTimestamp()
      };
      
      // Set the test mode properly
      paynow.setTestMode(true);
      
      // Add required test email for initiating payments in test mode
      payment.authemail = email || "test@example.com";
    }
    
    let response;
    
    // Initiate mobile payment if phone is provided
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      const paymentMethod = determinePaymentMethod(normalizedPhone);
      
      // Special test phone numbers documentation
      let testPhoneNumber = normalizedPhone;
      let testBehaviorDescription = '';
      
      if (isTestMode) {
        // Keep track of the original phone number for reference
        testConfig.originalPhone = normalizedPhone;
        
        // Paynow test mode phone numbers
        if (testBehavior === 'immediate-success' || testBehavior === 'quick-success') {
          testPhoneNumber = "0771111111"; // Quick success (5 seconds)
          testBehaviorDescription = 'immediate approval (5 seconds)';
        } else if (testBehavior === 'delayed-success') {
          testPhoneNumber = "0772222222"; // Delayed success (30 seconds)
          testBehaviorDescription = 'DELAYED SUCCESS (30 seconds)';
        } else if (testBehavior === 'user-cancelled') {
          testPhoneNumber = "0773333333"; // User cancelled (30 seconds)
          testBehaviorDescription = 'user cancelled (30 seconds)';
        } else if (testBehavior === 'system-cancelled') {
          testPhoneNumber = "0774444444"; // System cancelled (30 seconds)
          testBehaviorDescription = 'system cancellation (30 seconds)';
        }
        
        testConfig.testPhoneNumber = testPhoneNumber;
        testConfig.testBehaviorDescription = testBehaviorDescription;
      }
      
      // Initiate the mobile money payment
      response = await paynow.sendMobile(payment, testPhoneNumber, paymentMethod);
    } else {
      // Standard payment (redirect to Paynow)
      response = await paynow.send(payment);
    }
    
    // Check if payment initiation was successful
    if (response.success) {
      // Store payment information in Firestore
      const paymentData = {
        id: paymentId,
        reference,
        amount: parseFloat(amount),
        email,
        name,
        eventId,
        phone: phone || null,
        status: 'created',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pollUrl: response.pollUrl,
        paymentId: response.paymentId || null,
        instructions: response.instructions || null,
        isTestMode,
      };
      
      // Add test mode specific information if applicable
      if (isTestMode && testConfig) {
        paymentData.testBehavior = testConfig.testBehaviorDescription;
        paymentData.testMode = testConfig;
        paymentData.initiated = serverTimestamp();
      }
      
      // Store in Firestore
      await setDoc(doc(db, "payments", paymentId), paymentData);
      
      // Return the successful response
      return res.status(200).json({
        success: true,
        reference,
        pollUrl: response.pollUrl,
        redirectUrl: response.redirectUrl || null,
        paymentId,
        instructions: response.instructions || null,
        isTestMode,
        testMode: isTestMode ? testConfig : null
      });
    } else {
      // Payment initiation failed
      console.error("Payment initiation failed:", response.error);
      return res.status(400).json({
        success: false,
        error: response.error
      });
    }
  } catch (error) {
    console.error("Error creating payment:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Helper function to normalize phone numbers
function normalizePhone(phone) {
  // Remove spaces, hyphens, and other non-numeric characters
  let normalized = phone.replace(/\D/g, '');
  
  // Handle Zimbabwe phone numbers
  if (normalized.startsWith('07')) {
    return normalized;
  } else if (normalized.startsWith('7')) {
    return '0' + normalized;
  } else if (normalized.startsWith('2637')) {
    return '0' + normalized.substring(3);
  } else if (normalized.startsWith('+2637')) {
    return '0' + normalized.substring(4);
  }
  
  return normalized;
}

// Helper function to determine mobile payment method
function determinePaymentMethod(phone) {
  // Zimbabwe mobile payment providers
  if (phone.startsWith('071') || phone.startsWith('078')) {
    return 'onemoney';
  } else if (phone.startsWith('073')) {
    return 'telecash';
  } else {
    // Default to Ecocash for other prefixes (077, 078, etc.)
    return 'ecocash';
  }
} 