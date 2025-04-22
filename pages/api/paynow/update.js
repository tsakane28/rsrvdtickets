import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { registerAttendee } from "../../../utils/util";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log("Received Paynow update callback:", JSON.stringify(req.body));
    
    // Create Paynow instance to validate the hash
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Validate the hash sent by Paynow to ensure the request is legitimate
    if (!paynow.validateHash(req.body)) {
      console.error("Invalid hash received from Paynow");
      return res.status(400).json({ message: 'Invalid hash' });
    }

    // Extract payment data from the callback
    const { reference, paynowreference, amount, status, pollurl } = req.body;
    console.log(`Processing payment update: Reference=${reference}, Status=${status}`);
    
    // Find our existing payment record for this transaction
    const paymentsQuery = query(
      collection(db, "payments"),
      where("reference", "==", reference)
    );
    
    const paymentsSnapshot = await getDocs(paymentsQuery);
    let existingPayment = null;
    
    if (!paymentsSnapshot.empty) {
      // Found existing payment record(s)
      existingPayment = paymentsSnapshot.docs[0].data();
      const paymentDocRef = doc(db, "payments", paymentsSnapshot.docs[0].id);
      
      // Update the existing payment record
      await updateDoc(paymentDocRef, {
        paynowReference: paynowreference,
        status: status.toLowerCase(),
        statusUpdatedAt: serverTimestamp(),
        pollUrl: pollurl,
        callbackReceived: true,
        callbackTimestamp: serverTimestamp(),
        callbackData: JSON.stringify(req.body)
      });
      
      console.log(`Updated existing payment record: ${paymentsSnapshot.docs[0].id}`);
    } else {
      // No existing record found, create new one based on the reference
      // First extract event ID from the reference (assuming format Ticket-{eventId})
      const eventIdMatch = reference.match(/Ticket-(.*)/);
      let eventId = null;
      
      if (eventIdMatch && eventIdMatch.length > 1) {
        eventId = eventIdMatch[1];
      }
      
      // Save as a new payment record
      const newPaymentRef = doc(db, "payments", paynowreference);
      await setDoc(newPaymentRef, {
        reference,
        paynowReference: paynowreference,
        amount,
        status: status.toLowerCase(),
        pollUrl: pollurl,
        statusUpdatedAt: serverTimestamp(),
        callbackReceived: true,
        callbackTimestamp: serverTimestamp(),
        callbackData: JSON.stringify(req.body),
        eventId
      });
      
      console.log(`Created new payment record from callback: ${paynowreference}`);
    }
    
    // If payment is successful and we have user details, register the attendee
    if ((status.toLowerCase() === 'paid' || status.toLowerCase() === 'awaiting delivery') && existingPayment) {
      const { email, name, eventId } = existingPayment;
      
      if (email && name && eventId) {
        console.log(`Payment successful, registering attendee: ${name}, ${email} for event ${eventId}`);
        
        // Create payment info for registration
        const paymentInfo = {
          paymentId: paynowreference,
          amount: amount,
          currency: 'ZWL',
          timestamp: new Date().toISOString(),
          status: 'COMPLETED',
          paid: true,
          provider: 'Paynow-Callback'
        };
        
        // Register the attendee (pass null for success/loading callbacks since this is server-side)
        await registerAttendee(name, email, eventId, null, null, paymentInfo);
        console.log("Attendee registered successfully");
      } else {
        console.log("Missing user details, cannot register attendee automatically");
      }
    }
    
    // Paynow expects a 200 OK response
    return res.status(200).json({ message: 'Payment update received and processed' });
  } catch (error) {
    console.error("Error processing Paynow update:", error);
    // Still return 200 to acknowledge receipt (Paynow might retry otherwise)
    return res.status(200).json({ message: 'Error processing update, but received' });
  }
} 