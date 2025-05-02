// This endpoint would be called after a PayPal payment is completed
// In a production environment, you would integrate with PayPal's SDK to verify the payment

import { db } from "../../utils/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { registerAttendee } from "../../utils/util";
import { withAuthOrApiKey } from '../../middleware/authMiddleware';
import { paymentRateLimiter } from '../../middleware/rateLimit';
import { validateRequest } from '../../middleware/validateRequest';
import Joi from 'joi';

// Validation schema for payment verification
const verifyPaymentSchema = Joi.object({
  reference: Joi.string().required().trim(),
  markAsPaid: Joi.boolean().default(false)
});

// Main handler logic
const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { reference, markAsPaid = false } = req.body;

    // Log the verification attempt with the user who made it
    console.log(`Verifying payment with reference: ${reference}`);
    console.log(`Requested by: ${req.user?.email || 'API key'}`);

    if (!reference) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment reference is required' 
      });
    }

    // Find the payment in Firestore
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('reference', '==', reference));
    const paymentQuery = await getDocs(q);

    if (paymentQuery.empty) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    const paymentDoc = paymentQuery.docs[0];
    const payment = paymentDoc.data();
    
    // Check if payment is already marked as paid
    if (payment.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment was already marked as paid',
        payment
      });
    }

    // If markAsPaid flag is true, update the payment status
    if (markAsPaid) {
      // Require authentication for payment modification
      if (!req.user && !req.headers['x-api-key']) {
        return res.status(403).json({
          success: false,
          message: 'Authentication required to modify payment status'
        });
      }
      
      await updateDoc(paymentDoc.ref, {
        status: 'paid',
        updatedAt: new Date().toISOString(),
        verifiedBy: req.user?.email || 'admin-api'
      });

      // If there's an eventId and customerEmail, register the attendee
      if (payment.eventId && payment.customerEmail && payment.customerName) {
        try {
          // Get the event details
          const eventRef = doc(db, 'events', payment.eventId);
          const eventDoc = await getDoc(eventRef);
          
          if (eventDoc.exists()) {
            const event = eventDoc.data();
            
            // Check if attendee is already registered
            const existingAttendee = event.attendees?.find(a => 
              a.email === payment.customerEmail
            );
            
            if (!existingAttendee) {
              // Register the attendee
              await registerAttendee(
                payment.customerName,
                payment.customerEmail,
                payment.eventId,
                () => console.log('Attendee registered successfully'),
                () => {},
                {
                  paymentId: payment.reference,
                  timestamp: new Date().toISOString(),
                  paid: true
                }
              );
              
              console.log(`Registered attendee ${payment.customerName} for event ${payment.eventId}`);
            } else {
              console.log(`Attendee ${payment.customerEmail} already registered for this event`);
            }
          }
        } catch (registerError) {
          console.error('Error registering attendee:', registerError);
          // Continue execution even if registration fails
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment successfully marked as paid',
        payment: {
          ...payment,
          status: 'paid'
        }
      });
    }

    // If we're not marking as paid, just return the current status
    return res.status(200).json({
      success: true,
      payment
    });
    
  } catch (error) {
    console.error('Error in verify-payment API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// Apply middlewares
export default paymentRateLimiter(
  validateRequest(verifyPaymentSchema)(handler)
); 