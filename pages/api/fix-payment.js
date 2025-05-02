import { db } from '../../utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { registerAttendee } from '../../utils/util';
import { withAuthOrApiKey } from '../../middleware/authMiddleware';
import { paymentRateLimiter } from '../../middleware/rateLimit';
import { validateRequest } from '../../middleware/validateRequest';
import Joi from 'joi';

// Validation schema for payment fixing
const fixPaymentSchema = Joi.object({
  reference: Joi.string().required().trim(),
  markAsPaid: Joi.boolean().default(true)
});

// Main handler logic
const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { reference, markAsPaid = true } = req.body;

    console.log(`Attempting to fix payment with reference: ${reference}`);
    console.log(`Requested by user: ${req.user?.email || 'API key'}`);

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
    
    console.log(`Found payment:`, payment);
    
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
      // Update the payment status
      await updateDoc(paymentDoc.ref, {
        status: 'paid',
        updatedAt: new Date().toISOString(),
        manuallyVerified: true,
        verifiedBy: req.user?.email || 'admin-api'
      });

      console.log(`Updated payment status to paid`);

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
              console.log(`Registering attendee ${payment.customerName} for event ${payment.eventId}`);
              
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
              
              console.log(`Successfully registered attendee`);
            } else {
              console.log(`Attendee ${payment.customerEmail} already registered for this event`);
            }
          } else {
            console.log(`Event ${payment.eventId} not found`);
          }
        } catch (registerError) {
          console.error('Error registering attendee:', registerError);
          // Continue execution even if registration fails
        }
      } else {
        console.log('Missing customer information for registration');
        console.log('eventId:', payment.eventId);
        console.log('customerEmail:', payment.customerEmail);
        console.log('customerName:', payment.customerName);
      }

      return res.status(200).json({
        success: true,
        message: 'Payment successfully marked as paid and attendee registration processed',
        payment: {
          ...payment,
          status: 'paid'
        }
      });
    }

    // If we're not marking as paid, just return the current status
    return res.status(200).json({
      success: true,
      message: 'Payment found but not updated (markAsPaid=false)',
      payment
    });
    
  } catch (error) {
    console.error('Error in fix-payment API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Apply middlewares
export default paymentRateLimiter(
  withAuthOrApiKey(
    validateRequest(fixPaymentSchema)(handler)
  )
); 