import { db } from '../../../utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { validatePaynowSignature } from '../../../utils/security';
import { paymentRateLimiter } from '../../../middleware/rateLimit';

/**
 * Handles callbacks from Paynow for payment status updates
 * This endpoint is called by Paynow to update the status of a payment
 */
export default async function handler(req, res) {
  // Accept only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  let paymentReference = null;
  
  try {
    // Paynow sends updates as form data in the request body
    console.log('Paynow callback received:', JSON.stringify(req.body));
    
    // Check if this appears to be a test mode confirmation
    const isTestMode = req.body.status === 'paid' &&
                       (req.body.test === 'true' || req.body.test === true);
    
    // Extract the reference from the request body
    const { reference, poll_url, hash } = req.body;
    
    if (!reference) {
      return res.status(400).json({ error: 'Missing reference' });
    }
    
    paymentReference = reference;
    
    // Get the payment record from Firestore
    let paymentQuerySnapshot = await db.collection("payments")
                                      .where("reference", "==", reference)
                                      .limit(1)
                                      .get();
    
    if (paymentQuerySnapshot.empty) {
      return res.status(404).json({ error: `Payment not found with reference: ${reference}` });
    }
    
    const paymentDoc = paymentQuerySnapshot.docs[0];
    const paymentId = paymentDoc.id;
    const paymentData = paymentDoc.data();
    
    // Validate hash signature in production or when hash is provided
    const isProduction = process.env.NODE_ENV === 'production';
    const hashProvided = !!hash;
    
    if ((isProduction || hashProvided) && !isTestMode) {
      // Hash validation is mandatory in production or when hash is provided
      if (!hash) {
        console.error(`Missing hash parameter for reference: ${reference}`);
        return res.status(400).json({ error: 'Missing hash parameter for verification' });
      }
      
      // Get the integration key from environment variables
      const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
      
      if (!integrationKey) {
        console.error('Missing Paynow integration key in environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      // Validate the hash signature
      const isValid = validatePaynowSignature(req.body, hash, integrationKey);
      if (!isValid) {
        console.error(`Invalid hash signature for reference: ${reference}`);
        return res.status(403).json({ error: 'Invalid signature' });
      }
      
      console.log(`Hash signature verified for reference: ${reference}`);
    } else if (!isTestMode) {
      // In non-production environments without hash, log a warning
      console.warn(`No hash validation performed for reference: ${reference} - non-production environment`);
    }
    
    // Determine the new status based on Paynow's response
    const newStatus = req.body.status === 'paid' ? 'paid' : 
                    req.body.status === 'cancelled' ? 'cancelled' : 
                    req.body.status === 'awaiting delivery' ? 'waiting_delivery' : 
                    req.body.status === 'delivered' ? 'delivered' : 'pending';
    
    // Update data to be saved
    const updateData = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      statusReason: req.body.status_reason || null,
      paynowReference: req.body.paynow_reference || null,
      lastResponse: req.body,
    };
    
    // In test mode, mark as test payment
    if (isTestMode) {
      updateData.isTestMode = true;
      updateData.testModeConfirmed = true;
    }
    
    // Update the payment record in Firestore
    const paymentRef = doc(db, "payments", paymentId);
    await updateDoc(paymentRef, updateData);
    
    // If there's a status message from Paynow, log it
    if ((isTestMode && req.body.status_message) ||
        req.body.status_reason) {
      console.log(`Status update for ${reference}: ${req.body.status}, Reason: ${req.body.status_reason || req.body.status_message}`);
    }
    
    // Log the status update
    console.log(`Payment ${paymentId} updated to status: ${newStatus}`);
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: `Payment status updated to ${newStatus}` 
    });
    
  } catch (error) {
    console.error(`Error updating payment ${paymentReference}:`, error);
    
    // In production, don't expose error details
    const errorMessage = process.env.NODE_ENV === 'production' ? 
                         'An error occurred processing the payment update' : 
                         error.message;
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
}

// Apply rate limiter to prevent abuse
export default paymentRateLimiter(handler); 