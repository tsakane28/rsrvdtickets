import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { registerAttendee } from "../../../utils/util";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pollUrl, paymentId, reference } = req.body;
    
    if (!pollUrl && !paymentId && !reference) {
      return res.status(400).json({ error: 'Missing poll URL, paymentId, or reference' });
    }

    console.log(`Polling Paynow transaction status...`);
    
    // If we have a paymentId, get the payment details first
    let paymentData = null;
    let isTestMode = false;
    
    if (paymentId) {
      try {
        const paymentDoc = await getDoc(doc(db, "payments", paymentId));
        if (paymentDoc.exists()) {
          paymentData = paymentDoc.data();
          isTestMode = paymentData.isTestMode === true;
          
          if (isTestMode) {
            console.log(`This is a test mode payment with behavior: ${paymentData.testBehavior || "unknown"}`);
          }
        }
      } catch (err) {
        console.error("Error fetching payment data:", err);
      }
    }
    
    // If test mode and it's been more than 30 seconds, we can infer the result
    if (isTestMode && paymentData) {
      const initiatedTime = paymentData.initiated ? paymentData.initiated.toDate() : new Date(paymentData.initiated);
      const timeElapsed = (new Date() - initiatedTime) / 1000; // seconds
      
      console.log(`Test payment initiated ${timeElapsed.toFixed(0)} seconds ago`);
      
      // For 0771111111 - Quick success (5 seconds)
      if (paymentData.testBehavior && paymentData.testBehavior.includes("immediate approval") && timeElapsed > 5) {
        console.log("Test mode: Immediate success condition met");
        await handleTestModeSuccess(paymentData, paymentId);
        return res.status(200).json({
          paid: true,
          status: "paid",
          amount: paymentData.amount.toString(),
          reference: paymentData.reference,
          testMode: true
        });
      }
      
      // For 0772222222 - Delayed success (30 seconds)
      if (paymentData.testBehavior && paymentData.testBehavior.includes("DELAYED SUCCESS") && timeElapsed > 30) {
        console.log("Test mode: Delayed success condition met");
        await handleTestModeSuccess(paymentData, paymentId);
        return res.status(200).json({
          paid: true,
          status: "paid",
          amount: paymentData.amount.toString(),
          reference: paymentData.reference,
          testMode: true
        });
      }
      
      // For 0773333333 - User cancelled (30 seconds)
      if (paymentData.testBehavior && paymentData.testBehavior.includes("user cancelled") && timeElapsed > 30) {
        console.log("Test mode: User cancelled condition met");
        await updateDoc(doc(db, "payments", paymentId), {
          status: "cancelled",
          statusUpdatedAt: serverTimestamp(),
          updatedByPolling: true,
          testModeResult: "User cancelled"
        });
        
        return res.status(200).json({
          paid: false,
          status: "cancelled",
          amount: paymentData.amount.toString(),
          reference: paymentData.reference,
          testMode: true
        });
      }
    }

    // If we get here, proceed with normal polling
    console.log(`Polling URL: ${pollUrl}`);
    
    // Create Paynow instance
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Set timeout for the poll request to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Paynow polling timed out after 15 seconds')), 15000)
    );
    
    // Race between the poll request and the timeout
    const status = await Promise.race([
      paynow.pollTransaction(pollUrl),
      timeoutPromise
    ]);
    
    // Log full response for debugging
    console.log('Paynow status response:', JSON.stringify(status));
    
    // If payment is successful AND we have a payment ID, update the payment record
    // This serves as a fallback when the Paynow callback doesn't work
    const isPaid = status.paid ? status.paid() : false;
    if (isPaid) {
      console.log("Payment is marked as paid, updating records");
      
      // First try to find the payment with the provided payment ID
      if (paymentId) {
        console.log(`Updating payment record with ID: ${paymentId}`);
        try {
          const paymentRef = doc(db, "payments", paymentId);
          await updateDoc(paymentRef, {
            status: "paid",
            statusUpdatedAt: serverTimestamp(),
            updatedByPolling: true,
            pollingTimestamp: serverTimestamp(),
          });
          console.log(`Successfully updated payment record: ${paymentId}`);
          
          // Register the attendee if not already done
          if (paymentData) {
            const { name, email, eventId } = paymentData;
            
            if (name && email && eventId) {
              console.log(`Registering attendee from polling: ${name}, ${email}, ${eventId}`);
              
              // Create payment info
              const paymentInfo = {
                paymentId: status.reference || paymentId,
                amount: status.amount,
                currency: 'ZWL',
                timestamp: new Date().toISOString(),
                status: 'COMPLETED',
                paid: true,
                provider: 'Paynow-Polling'
              };
              
              // Register the attendee
              await registerAttendee(name, email, eventId, null, null, paymentInfo);
              console.log("Successfully registered attendee from polling data");
            }
          }
        } catch (updateError) {
          console.error("Error updating payment record:", updateError);
        }
      } else if (status.reference) {
        // Try to find the payment by reference
        console.log(`Looking for payment with reference: ${status.reference}`);
        try {
          const payments = query(
            collection(db, "payments"),
            where("reference", "==", status.reference)
          );
          
          const paymentsSnapshot = await getDocs(payments);
          if (!paymentsSnapshot.empty) {
            // Update the payment record
            const paymentDoc = paymentsSnapshot.docs[0];
            await updateDoc(doc(db, "payments", paymentDoc.id), {
              status: "paid",
              statusUpdatedAt: serverTimestamp(),
              updatedByPolling: true,
              pollingTimestamp: serverTimestamp(),
            });
            console.log(`Updated payment record by reference: ${paymentDoc.id}`);
            
            // Get data for registration
            const paymentData = paymentDoc.data();
            const { name, email, eventId } = paymentData;
            
            if (name && email && eventId) {
              // Create payment info
              const paymentInfo = {
                paymentId: status.reference,
                amount: status.amount,
                currency: 'ZWL',
                timestamp: new Date().toISOString(),
                status: 'COMPLETED',
                paid: true,
                provider: 'Paynow-Polling'
              };
              
              // Register the attendee
              await registerAttendee(name, email, eventId, null, null, paymentInfo);
              console.log("Successfully registered attendee from polling by reference");
            }
          }
        } catch (updateError) {
          console.error("Error updating payment by reference:", updateError);
        }
      }
    }
    
    // Return the status directly, using the paid() method as shown in documentation
    return res.status(200).json({
      // This matches the documentation exactly - status.paid() is a method we need to call
      paid: isPaid,
      status: status.status || 'unknown',
      amount: status.amount,
      reference: status.reference,
      // Include the raw status object for completeness
      rawStatus: status
    });
  } catch (error) {
    console.error("Error polling transaction:", error);
    return res.status(200).json({ 
      error: error.message || 'An error occurred while polling the transaction',
      paid: false
    });
  }
}

// Helper function to handle test mode success
async function handleTestModeSuccess(paymentData, paymentId) {
  try {
    // Update payment record
    await updateDoc(doc(db, "payments", paymentId), {
      status: "paid",
      statusUpdatedAt: serverTimestamp(),
      updatedByPolling: true,
      testModeResult: "Success"
    });
    
    // Register the attendee
    const { name, email, eventId } = paymentData;
    
    if (name && email && eventId) {
      // Create payment info
      const paymentInfo = {
        paymentId: paymentId,
        amount: paymentData.amount,
        currency: 'ZWL',
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        paid: true,
        provider: 'Paynow-TestMode'
      };
      
      // Register the attendee
      await registerAttendee(name, email, eventId, null, null, paymentInfo);
      console.log("Successfully registered test mode attendee");
    }
  } catch (err) {
    console.error("Error handling test mode success:", err);
  }
} 