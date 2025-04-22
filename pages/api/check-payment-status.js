import { db } from "../../utils/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { event_id, email } = req.query;
    
    if (!event_id || !email) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

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
      return res.status(200).json({ status: "paid" });
    }
    
    // If no paid registration found, check for pending payments
    const paymentsCollectionRef = collection(db, "payments");
    const paymentsQuery = query(
      paymentsCollectionRef,
      where("reference", "==", `Ticket-${event_id}`),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    if (!paymentsSnapshot.empty) {
      const paymentData = paymentsSnapshot.docs[0].data();
      
      if (paymentData.status.toLowerCase() === 'paid') {
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
    return res.status(200).json({ status: "not_found" });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 