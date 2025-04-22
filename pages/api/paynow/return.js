import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { registerAttendee } from "../../../utils/util";

export default async function handler(req, res) {
  // This endpoint should handle GET requests as users will be redirected here by Paynow
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { event_id, email, name } = req.query;
    
    if (!event_id || !email || !name) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Create Paynow instance
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Check if a transaction reference is provided in the query params
    const { reference } = req.query;
    
    if (reference) {
      // Try to find the payment in our database
      const paymentRef = doc(db, "payments", reference);
      const paymentDoc = await getDoc(paymentRef);
      
      if (paymentDoc.exists() && paymentDoc.data().status.toLowerCase() === 'paid') {
        // Payment exists and is marked as paid
        // We can register the attendee
        const paymentInfo = {
          paymentId: reference,
          amount: paymentDoc.data().amount,
          currency: 'ZWL',
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          paid: true,
          provider: 'Paynow'
        };
        
        // Register the attendee
        await registerAttendee(name, email, event_id, null, null, paymentInfo);
        
        // Redirect to success page
        return res.redirect(`/register/${event_id}/success?payment=completed`);
      }
    }
    
    // If no reference or payment not found/not paid, redirect to a pending payment page
    return res.redirect(`/register/${event_id}/pending?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
  } catch (error) {
    console.error("Error processing Paynow return:", error);
    // Redirect to error page
    return res.redirect(`/register/${req.query.event_id}/error`);
  }
} 