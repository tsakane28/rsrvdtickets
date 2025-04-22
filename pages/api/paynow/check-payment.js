import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId } = req.query;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    console.log(`Checking payment status for payment ID: ${paymentId}`);

    // Get the payment from Firestore
    const paymentRef = doc(db, "payments", paymentId);
    const paymentSnap = await getDoc(paymentRef);

    if (!paymentSnap.exists()) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const paymentData = paymentSnap.data();
    const { pollUrl, status, reference, isTestMode } = paymentData;

    // If the payment is already marked as paid or cancelled, return the current status
    if (status === 'paid' || status === 'cancelled') {
      return res.status(200).json({
        success: true,
        status,
        reference,
        paid: status === 'paid',
        isTestMode
      });
    }

    // For test mode payments, handle according to test behavior
    if (isTestMode && paymentData.testMode) {
      const testBehavior = paymentData.testMode.testBehavior || 'immediate-success';
      const initiatedAt = paymentData.testMode.initiatedAt?.toDate() || new Date(paymentData.createdAt);
      const now = new Date();
      const elapsedSeconds = (now - initiatedAt) / 1000;
      
      let newStatus = status;
      let statusMessage = '';
      
      // Simulate different test behaviors
      switch (testBehavior) {
        case 'immediate-success':
          newStatus = 'paid';
          statusMessage = 'Test payment completed successfully';
          break;
        case 'delayed-success':
          // Wait 30 seconds before marking as paid
          if (elapsedSeconds > 30) {
            newStatus = 'paid';
            statusMessage = 'Test payment completed after delay';
          } else {
            newStatus = 'pending';
            statusMessage = `Test payment pending (will complete in ${Math.ceil(30 - elapsedSeconds)} seconds)`;
          }
          break;
        case 'user-cancelled':
          // Wait 15 seconds before marking as cancelled
          if (elapsedSeconds > 15) {
            newStatus = 'cancelled';
            statusMessage = 'Test payment cancelled by user';
          } else {
            newStatus = 'pending';
            statusMessage = 'Test payment pending (will be cancelled by user)';
          }
          break;
        case 'system-cancelled':
          // Wait 15 seconds before marking as cancelled
          if (elapsedSeconds > 15) {
            newStatus = 'cancelled';
            statusMessage = 'Test payment cancelled by system';
          } else {
            newStatus = 'pending';
            statusMessage = 'Test payment pending (will be cancelled by system)';
          }
          break;
        default:
          newStatus = 'pending';
          statusMessage = 'Test payment in unknown state';
      }
      
      // Update the status if it has changed
      if (newStatus !== status) {
        await updateDoc(paymentRef, {
          status: newStatus,
          statusUpdatedAt: serverTimestamp(),
          updatedByPolling: true,
          statusMessage
        });
        
        console.log(`Updated test mode payment ${paymentId} with status: ${newStatus}`);
      }
      
      return res.status(200).json({
        success: true,
        status: newStatus,
        reference,
        paid: newStatus === 'paid',
        isTestMode: true,
        testMode: true,
        statusMessage
      });
    }

    // For production payments, check with Paynow
    if (!pollUrl) {
      return res.status(400).json({ error: 'Poll URL not found for this payment' });
    }

    // Create a new Paynow instance
    const paynow = new Paynow("20667", "83c8858d-2244-4f0f-accd-b64e9f877eaa");
    
    // Check the payment status
    const statusResponse = await paynow.pollTransaction(pollUrl);
    console.log(`Paynow status response for ${paymentId}:`, statusResponse);
    
    let newStatus = status;
    
    if (statusResponse.paid) {
      newStatus = 'paid';
    } else if (statusResponse.status && statusResponse.status.toLowerCase() === 'cancelled') {
      newStatus = 'cancelled';
    } else if (statusResponse.status) {
      newStatus = statusResponse.status.toLowerCase();
    }
    
    // Update the payment record if the status has changed
    if (newStatus !== status) {
      await updateDoc(paymentRef, {
        status: newStatus,
        statusUpdatedAt: serverTimestamp(),
        updatedByPolling: true,
        statusMessage: statusResponse.error || 'Updated via polling'
      });
      
      console.log(`Updated payment ${paymentId} with status: ${newStatus}`);
    }
    
    return res.status(200).json({
      success: true,
      status: newStatus,
      reference,
      paid: newStatus === 'paid',
      paynowStatus: statusResponse.status,
      paynowPaid: statusResponse.paid,
      isTestMode: false
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
} 