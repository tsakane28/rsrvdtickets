// This endpoint would be called after a PayPal payment is completed
// In a production environment, you would integrate with PayPal's SDK to verify the payment

import { db } from "../../utils/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { registerAttendee } from "../../utils/util";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { paymentId, email, eventId, markAsPaid } = req.body;

    if (!paymentId && !email && !eventId) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one of paymentId, email, or eventId is required' 
      });
    }

    // Build query to find matching payments
    let paymentsQuery;
    
    if (paymentId) {
      // Direct lookup by ID
      const paymentRef = doc(db, "payments", paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (paymentDoc.exists()) {
        // If markAsPaid is true, update the status
        if (markAsPaid) {
          await updateDoc(paymentRef, {
            status: "paid",
            statusUpdatedAt: serverTimestamp(),
            manuallyVerified: true,
            verificationTimestamp: serverTimestamp(),
          });
          
          // Get payment data to register the attendee
          const paymentData = paymentDoc.data();
          const { name, email, eventId } = paymentData;
          
          if (name && email && eventId) {
            // Create payment info for registration
            const paymentInfo = {
              paymentId: paymentId,
              amount: paymentData.amount || 0,
              currency: 'ZWL',
              timestamp: new Date().toISOString(),
              status: 'COMPLETED',
              paid: true,
              provider: 'Manual-Verification'
            };
            
            // Register the attendee
            await registerAttendee(name, email, eventId, null, null, paymentInfo);
          }
        }
        
        return res.status(200).json({
          success: true,
          message: markAsPaid ? 'Payment marked as paid and attendee registered' : 'Payment found',
          payment: paymentDoc.data()
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }
    } else {
      // Build query based on available parameters
      let paymentsQuery = collection(db, "payments");
      let conditions = [];
      
      if (email) {
        conditions.push(where("email", "==", email));
      }
      
      if (eventId) {
        conditions.push(where("eventId", "==", eventId));
      }
      
      // Apply conditions to query
      if (conditions.length > 0) {
        paymentsQuery = query(paymentsQuery, ...conditions);
      }
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (paymentsSnapshot.empty) {
        return res.status(404).json({
          success: false,
          message: 'No matching payments found'
        });
      }
      
      // Return the found payments
      const payments = [];
      paymentsSnapshot.forEach(doc => {
        payments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return res.status(200).json({
        success: true,
        message: `Found ${payments.length} matching payment(s)`,
        payments
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during payment verification',
      error: error.message
    });
  }
} 