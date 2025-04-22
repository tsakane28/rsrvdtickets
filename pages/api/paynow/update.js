import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { registerAttendee } from "../../../utils/util";

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("Received Paynow update callback", JSON.stringify(req.body));

  try {
    // Extract the hash & data from the request
    const { hash, reference, paynow_reference, amount, status, poll_url, phone } = req.body;

    // Validate that we have the necessary data
    if (!reference || !status) {
      console.error("Missing required fields in Paynow update callback");
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Processing Paynow update callback for reference: ${reference}, status: ${status}`);

    // Create Paynow instance for validation
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");

    // Find the payment in the database
    const paymentsQuery = query(
      collection(db, "payments"),
      where("reference", "==", reference)
    );

    const paymentsSnapshot = await getDocs(paymentsQuery);

    if (paymentsSnapshot.empty) {
      console.error(`No payment found with reference: ${reference}`);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentDoc = paymentsSnapshot.docs[0];
    const paymentId = paymentDoc.id;
    const paymentData = paymentDoc.data();
    const isTestMode = paymentData.isTestMode === true;

    console.log(`Found payment: ${paymentId}, status: ${status}, isTestMode: ${isTestMode}`);

    // For test mode, we'll be more lenient with validation
    let isValidHash = true;
    
    // For production mode, validate the hash
    if (!isTestMode) {
      try {
        isValidHash = paynow.verifyHash(req.body);
        if (!isValidHash) {
          console.error("Invalid hash in Paynow update callback");
        }
      } catch (error) {
        console.error("Error validating Paynow hash:", error);
        isValidHash = false;
      }
    } else {
      console.log("Test mode payment - skipping hash validation");
    }

    // Update payment record with status from Paynow
    const updateData = {
      status: status.toLowerCase(),
      statusUpdatedAt: serverTimestamp(),
      updatedByCallback: true,
      callbackTimestamp: serverTimestamp(),
    };

    if (paynow_reference) {
      updateData.paynowReference = paynow_reference;
    }

    if (poll_url) {
      updateData.pollUrl = poll_url;
    }

    // Log validation status
    if (!isValidHash) {
      updateData.hashValidation = "failed";
      console.warn("Hash validation failed, but still updating payment status");
    } else {
      updateData.hashValidation = "passed";
    }

    // Update test mode specific data
    if (isTestMode) {
      updateData.testModeCallback = true;
      updateData.testModeCallbackStatus = status;
    }

    // Update the payment record
    await updateDoc(doc(db, "payments", paymentId), updateData);
    console.log(`Updated payment ${paymentId} with status: ${status}`);

    // If payment is marked as paid, register the attendee
    if (status.toLowerCase() === 'paid') {
      console.log(`Payment ${paymentId} is marked as paid, registering attendee`);
      try {
        // Get the necessary data for registration
        const { name, email, eventId } = paymentData;

        if (name && email && eventId) {
          console.log(`Registering attendee: ${name}, ${email}, ${eventId}`);
          
          // Create payment info
          const paymentInfo = {
            paymentId,
            amount,
            currency: 'ZWL',
            timestamp: new Date().toISOString(),
            status: 'COMPLETED',
            paid: true,
            provider: isTestMode ? 'Paynow-TestMode' : 'Paynow',
            paynowReference: paynow_reference
          };
          
          // Register the attendee
          await registerAttendee(name, email, eventId, null, null, paymentInfo);
          console.log("Successfully registered attendee");
        } else {
          console.warn("Missing required fields for attendee registration");
        }
      } catch (registrationError) {
        console.error("Error registering attendee:", registrationError);
      }
    }

    // Return 200 status to acknowledge receipt of the update
    return res.status(200).json({ 
      message: 'Update received',
      reference,
      status,
      isTestMode
    });
  } catch (error) {
    console.error("Error processing Paynow update:", error);
    return res.status(500).json({ error: error.message });
  }
} 