import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Create Paynow instance to validate the hash
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Validate the hash sent by Paynow to ensure the request is legitimate
    if (!paynow.validateHash(req.body)) {
      console.error("Invalid hash received from Paynow");
      return res.status(400).json({ message: 'Invalid hash' });
    }

    // Extract payment data
    const { reference, paynowreference, amount, status, pollurl } = req.body;
    
    // Store payment information in Firestore
    const paymentRef = doc(db, "payments", paynowreference);
    await setDoc(paymentRef, {
      reference,
      paynowReference: paynowreference,
      amount,
      status,
      pollUrl: pollurl,
      timestamp: serverTimestamp(),
      raw: JSON.stringify(req.body),
      verified: true
    });

    // If payment was successful, update the corresponding ticket/registration
    if (status.toLowerCase() === 'paid' || status.toLowerCase() === 'awaiting delivery') {
      // Extract event ID from reference (assuming format is Ticket-{eventId})
      const eventId = reference.split('-')[1];
      
      if (eventId) {
        // Look for any registrations with this reference
        // You may need to adjust this based on your registration data structure
        const registrationsRef = doc(db, "events", eventId, "registrations", reference);
        const registrationDoc = await getDoc(registrationsRef);
        
        if (registrationDoc.exists()) {
          await setDoc(registrationsRef, {
            ...registrationDoc.data(),
            paymentStatus: 'paid',
            paynowReference: paynowreference,
            paid: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
    }
    
    // Paynow expects a 200 OK response
    return res.status(200).json({ message: 'Payment update received' });
  } catch (error) {
    console.error("Error processing Paynow update:", error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 