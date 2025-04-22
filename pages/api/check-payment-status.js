import { db } from "../../utils/firebase";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { event_id, email, paymentId } = req.query;
    
    // Check if we have a specific payment ID to check
    if (paymentId) {
      console.log(`Checking payment status for specific payment ID: ${paymentId}`);
      const paymentDoc = await getDoc(doc(db, "payments", paymentId));
      
      if (paymentDoc.exists()) {
        const paymentData = paymentDoc.data();
        
        // Check if the payment status indicates it's paid
        if (paymentData.status && (
            paymentData.status.toLowerCase() === 'paid' || 
            paymentData.status.toLowerCase() === 'awaiting delivery' ||
            paymentData.status.toLowerCase() === 'created'
          )) {
          return res.status(200).json({ 
            status: "paid",
            paymentData
          });
        } else {
          return res.status(200).json({ 
            status: "pending", 
            pollUrl: paymentData.pollUrl,
            paymentData
          });
        }
      } else {
        return res.status(200).json({ status: "not_found" });
      }
    }
    
    // If no payment ID provided, need event_id and email
    if (!event_id || !email) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    console.log(`Checking payment status for event: ${event_id}, email: ${email}`);
    
    // First check if there's already a completed registration for this email and event
    const registrationsCollectionRef = collection(db, "events", event_id, "registrations");
    const registrationsQuery = query(
      registrationsCollectionRef,
      where("email", "==", email),
      where("paid", "==", true),
      limit(1)
    );
    
    const registrationsSnapshot = await getDocs(registrationsQuery);
    
    if (!registrationsSnapshot.empty) {
      // Found a paid registration
      console.log("Found existing paid registration");
      return res.status(200).json({ status: "paid" });
    }
    
    // If no paid registration found, check for payments in our payment collection
    console.log("Checking payment records");
    const paymentsCollectionRef = collection(db, "payments");
    const paymentsQuery = query(
      paymentsCollectionRef,
      where("eventId", "==", event_id),
      where("email", "==", email),
      orderBy("initiated", "desc"),
      limit(1)
    );
    
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    if (!paymentsSnapshot.empty) {
      const paymentData = paymentsSnapshot.docs[0].data();
      console.log(`Found payment record with status: ${paymentData.status}`);
      
      // Check if status indicates payment is complete
      if (paymentData.status && (
          paymentData.status.toLowerCase() === 'paid' || 
          paymentData.status.toLowerCase() === 'awaiting delivery' ||
          paymentData.status.toLowerCase() === 'created'
        )) {
        return res.status(200).json({ 
          status: "paid",
          paymentData
        });
      } else {
        // Payment exists but not paid yet
        return res.status(200).json({ 
          status: "pending", 
          pollUrl: paymentData.pollUrl,
          paymentData
        });
      }
    }
    
    // As a fallback, check the legacy payments using reference format
    console.log("Checking legacy payment records");
    const legacyPaymentsQuery = query(
      paymentsCollectionRef,
      where("reference", "==", `Ticket-${event_id}`),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    
    const legacyPaymentsSnapshot = await getDocs(legacyPaymentsQuery);
    
    if (!legacyPaymentsSnapshot.empty) {
      const paymentData = legacyPaymentsSnapshot.docs[0].data();
      console.log(`Found legacy payment record with status: ${paymentData.status}`);
      
      if (paymentData.status && (
          paymentData.status.toLowerCase() === 'paid' || 
          paymentData.status.toLowerCase() === 'awaiting delivery'
        )) {
        return res.status(200).json({ status: "paid" });
      } else {
        // Payment exists but not paid yet
        return res.status(200).json({ 
          status: "pending", 
          pollUrl: paymentData.pollUrl
        });
      }
    }
    
    // No payment record found
    console.log("No payment records found");
    return res.status(200).json({ status: "not_found" });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 