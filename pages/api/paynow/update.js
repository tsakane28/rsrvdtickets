import { db } from '../../../utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { validatePaynowSignature } from '../../../utils/security';
import { paymentRateLimiter } from '../../../middleware/rateLimit';

/**
 * Handles callbacks from Paynow for payment status updates
 */
const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  
  try {
    // Log the full callback data for debugging
    console.log('Paynow callback received:', JSON.stringify(req.body));
    
    // Check if we're in test mode (no hash verification for test mode)
    const isTestMode = req.body.status === 'paid' && 
                      req.body.status_message && 
                      req.body.status_message.includes('TESTING');
    
    // Extract payment details from callback
    const { 
      reference, 
      paynow_reference, 
      amount, 
      status, 
      poll_url,
      hash,
      phone
    } = req.body;
    
    // Validate required fields
    if (!reference || !status) {
      console.error('Missing required fields in Paynow callback');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Verify the signature if not in test mode
    if (!isTestMode && hash) {
      const isValidHash = validatePaynowSignature(
        req.body, 
        hash, 
        process.env.PAYNOW_INTEGRATION_KEY
      );
      
      if (!isValidHash) {
        console.error("Invalid hash in Paynow update callback");
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid signature' 
        });
      }
    }
    
    // Find the payment in our database
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('reference', '==', reference));
    const paymentQuery = await getDocs(q);
    
    if (paymentQuery.empty) {
      console.error(`Payment with reference ${reference} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    const paymentDoc = paymentQuery.docs[0];
    const paymentData = paymentDoc.data();
    
    // Log payment status update
    console.log(`Updating payment ${reference} status from ${paymentData.status} to ${status}`);
    
    // Update the payment status
    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Add additional fields if they exist
    if (paynow_reference) updateData.paynowReference = paynow_reference;
    if (amount) updateData.confirmedAmount = parseFloat(amount);
    if (poll_url) updateData.pollUrl = poll_url;
    if (phone) updateData.phone = phone;
    
    // Add test mode flag if applicable
    if (isTestMode) {
      updateData.isTestMode = true;
      updateData.testDetails = {
        originalStatus: status,
        testMessage: req.body.status_message || 'Test payment'
      };
    }
    
    // Update the payment in Firestore
    await updateDoc(doc(db, 'payments', paymentDoc.id), updateData);
    
    // If payment is successful, trigger attendee registration
    if (status === 'paid' || 
        (isTestMode && req.body.status_message && 
         req.body.status_message.includes('Success'))) {
      
      try {
        // We don't wait for this to complete
        fetch(`${req.headers.origin || process.env.NEXT_PUBLIC_BASE_URL}/api/fix-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.INTERNAL_API_KEY
          },
          body: JSON.stringify({
            reference,
            markAsPaid: true
          })
        }).catch(err => {
          console.error('Error triggering attendee registration:', err);
        });
      } catch (err) {
        console.error('Error initiating registration webhook:', err);
      }
    }
    
    // Return success response to Paynow
    return res.status(200).json({
      success: true,
      message: 'Payment update received'
    });
    
  } catch (error) {
    console.error('Error processing Paynow callback:', error);
    
    // Return error response
    return res.status(500).json({
      success: false,
      message: 'Error processing payment update'
    });
  }
};

// Apply rate limiter to prevent abuse
export default paymentRateLimiter(handler); 