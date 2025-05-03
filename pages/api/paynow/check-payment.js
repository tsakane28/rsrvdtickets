import { Paynow } from "paynow";
import { db } from "../../../utils/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get payment ID from query or body
    const paymentId = req.method === 'GET' ? req.query.id : req.body.paymentId;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Missing payment ID' });
    }
    
    // Get payment document from Firestore
    const paymentRef = doc(db, "payments", paymentId);
    const paymentDoc = await getDoc(paymentRef);
    
    if (!paymentDoc.exists()) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentData = paymentDoc.data();
    const { pollUrl, status, reference, isTestMode } = paymentData;
    
    // If already paid, return success
    if (status === 'paid') {
      return res.status(200).json({
        success: true,
        status: 'paid',
        reference,
        message: 'Payment has been completed'
      });
    }
    
    // If cancelled, return error
    if (status === 'cancelled') {
      return res.status(200).json({
        success: false,
        status: 'cancelled',
        reference,
        error: 'Payment was cancelled'
      });
    }
    
    // Handle test mode differently depending on environment
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production, always check with actual Paynow service
    if (isProduction) {
      // In production, we should have a pollUrl
      if (!pollUrl) {
        return res.status(400).json({
          success: false,
          error: 'Missing poll URL for payment status check'
        });
      }
      
      try {
        // Check status with Paynow
        console.log(`Checking payment status with Paynow for ${paymentId}...`);
        
        // Create a new Paynow instance with credentials from environment variables
        const integrationId = process.env.PAYNOW_INTEGRATION_ID || "20667";
        const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || "83c8858d-2244-4f0f-accd-b64e9f877eaa";
        const paynow = new Paynow(integrationId, integrationKey);
        
        // Poll for transaction status
        const statusResponse = await paynow.pollTransaction(pollUrl);
        console.log(`Paynow status response for ${paymentId}:`, statusResponse);
        
        // Update payment status based on Paynow response
        if (statusResponse.paid) {
          // Payment completed successfully
          await updateDoc(paymentRef, {
            status: 'paid',
            updatedAt: serverTimestamp(),
            paynowStatus: statusResponse.status,
            paynowPaid: statusResponse.paid,
            lastChecked: serverTimestamp(),
            lastResponse: statusResponse
          });
          
          return res.status(200).json({
            success: true,
            status: 'paid',
            reference,
            message: 'Payment completed successfully'
          });
        } else if (statusResponse.status.toLowerCase() === 'cancelled') {
          // Payment was cancelled
          await updateDoc(paymentRef, {
            status: 'cancelled',
            updatedAt: serverTimestamp(),
            paynowStatus: statusResponse.status,
            paynowPaid: statusResponse.paid,
            lastChecked: serverTimestamp(),
            lastResponse: statusResponse
          });
          
          return res.status(200).json({
            success: false,
            status: 'cancelled',
            reference,
            error: 'Payment was cancelled'
          });
        } else {
          // Payment still pending
          await updateDoc(paymentRef, {
            lastChecked: serverTimestamp(),
            paynowStatus: statusResponse.status,
            paynowPaid: statusResponse.paid,
            lastResponse: statusResponse
          });
          
          return res.status(200).json({
            success: true,
            status: 'pending',
            reference,
            message: 'Payment is still pending'
          });
        }
      } catch (error) {
        console.error(`Error checking payment status with Paynow for ${paymentId}:`, error);
        
        return res.status(500).json({
          success: false,
          error: 'Failed to check payment status'
        });
      }
    } else {
      // In development, handle test mode payments
      if (isTestMode && paymentData.testMode) {
        const testBehavior = paymentData.testMode.testBehavior || 'immediate-success';
        const initiatedAt = paymentData.testMode.initiatedAt?.toDate() || new Date(paymentData.createdAt);
        
        // Current time
        const now = new Date();
        const timeDiff = now.getTime() - initiatedAt.getTime();
        const secondsPassed = Math.floor(timeDiff / 1000);
        
        // Simulate different payment outcomes based on test behavior
        if (testBehavior === 'immediate-success' || testBehavior === 'quick-success') {
          // Success after 5 seconds
          if (secondsPassed >= 5) {
            // Update payment to success
            await updateDoc(paymentRef, {
              status: 'paid',
              updatedAt: serverTimestamp(),
              isTestMode: true,
              testMode: true,
              testModeResult: 'Simulated success after 5 seconds'
            });
            
            return res.status(200).json({
              success: true,
              status: 'paid',
              reference,
              message: 'Test payment completed successfully'
            });
          }
        } else if (testBehavior === 'delayed-success') {
          // Success after 30 seconds
          if (secondsPassed >= 30) {
            await updateDoc(paymentRef, {
              status: 'paid',
              updatedAt: serverTimestamp(),
              isTestMode: true,
              testMode: true,
              testModeResult: 'Simulated delayed success after 30 seconds'
            });
            
            return res.status(200).json({
              success: true,
              status: 'paid',
              reference,
              message: 'Test payment completed after delay'
            });
          }
        } else if (testBehavior === 'user-cancelled') {
          // User cancelled after 30 seconds
          if (secondsPassed >= 30) {
            await updateDoc(paymentRef, {
              status: 'cancelled',
              updatedAt: serverTimestamp(),
              isTestMode: true,
              testMode: true,
              testModeResult: 'Simulated user cancellation'
            });
            
            return res.status(200).json({
              success: false,
              status: 'cancelled',
              reference,
              error: 'Payment was cancelled by user'
            });
          }
        } else if (testBehavior === 'system-cancelled') {
          // System cancelled after 30 seconds
          if (secondsPassed >= 30) {
            await updateDoc(paymentRef, {
              status: 'cancelled',
              updatedAt: serverTimestamp(),
              isTestMode: true,
              testMode: true,
              testModeResult: 'Simulated system cancellation'
            });
            
            return res.status(200).json({
              success: false,
              status: 'cancelled',
              reference,
              error: 'Payment was cancelled by the system'
            });
          }
        }
        
        // If we're here, payment is still pending
        return res.status(200).json({
          success: true,
          status: 'pending',
          reference,
          message: 'Test payment is still processing',
          waitTime: secondsPassed
        });
      }
      
      // For non-test payments in development, just return pending
      return res.status(200).json({
        success: true,
        status: 'pending',
        reference,
        message: 'Payment status is pending'
      });
    }
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'An error occurred while checking payment status' : error.message
    });
  }
} 