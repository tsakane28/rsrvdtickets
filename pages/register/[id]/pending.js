import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../../utils/firebase";
import Loading from "../../../components/Loading";
import ErrorPage from "../../../components/ErrorPage";

export async function getServerSideProps(context) {
  const docRef = doc(db, "events", context.query.id);
  const docSnap = await getDoc(docRef);
  let firebaseEvent = {};
  if (docSnap.exists()) {
    firebaseEvent = docSnap.data();
  } else {
    console.log("No such document!");
  }
  return {
    props: { event: firebaseEvent },
  };
}

const PendingPage = ({ event }) => {
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [pollErrors, setPollErrors] = useState(0);
  const [manualVerification, setManualVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { name, email } = router.query;
  
  // Check payment status on load
  useEffect(() => {
    if (!router.isReady) return;
    
    const checkPaymentStatus = async () => {
      try {
        // Try to get the payment ID from localStorage first
        const storedPaymentId = localStorage.getItem('paymentId');
        const storedEventId = localStorage.getItem('eventId');
        const storedEmail = localStorage.getItem('userEmail');
        const storedName = localStorage.getItem('userName');
        
        console.log("Checking payment status with stored details:", {
          paymentId: storedPaymentId,
          eventId: router.query.id,
          email
        });
        
        // If we have a stored payment ID and it matches this event, use it
        if (storedPaymentId && storedEventId === router.query.id) {
          console.log("Using stored payment ID:", storedPaymentId);
          
          // Check status using the specific payment ID
          const response = await fetch(`/api/check-payment-status?paymentId=${storedPaymentId}`);
          const data = await response.json();
          
          console.log("Payment status response:", data);
          
          if (data.status === "paid") {
            console.log("Payment status: PAID via stored payment ID");
            setStatus("paid");
            // Redirect to success page after 2 seconds
            setTimeout(() => {
              router.push(`/register/${router.query.id}/success`);
              // Clear payment info from localStorage after successful verification
              localStorage.removeItem('paymentId');
              localStorage.removeItem('paymentTime');
            }, 2000);
            return; // Exit early since we're done
          }
          
          // If there's a poll URL, try polling as a fallback
          if (data.status === "pending" && data.pollUrl) {
            console.log("Payment status: PENDING via stored payment ID, will try polling");
            await tryPollingPaymentStatus(data.pollUrl);
          }
        } else {
          // Fallback to checking by event_id and email
          console.log("No stored payment ID found or different event, checking by event/email");
          const response = await fetch(`/api/check-payment-status?event_id=${router.query.id}&email=${encodeURIComponent(email)}`);
          const data = await response.json();
          
          console.log("Payment status response:", data);
          
          if (data.status === "paid") {
            console.log("Payment status: PAID via event/email check");
            setStatus("paid");
            // Redirect to success page after 2 seconds
            setTimeout(() => {
              router.push(`/register/${router.query.id}/success`);
            }, 2000);
            return; // Exit early since we're done
          }
          
          // If there's a poll URL, try polling as a fallback
          if (data.status === "pending" && data.pollUrl) {
            console.log("Payment status: PENDING via event/email check, will try polling");
            await tryPollingPaymentStatus(data.pollUrl);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error checking payment status:", error);
        setPollErrors(prev => prev + 1);
        setErrorMessage(error.message || "Error checking payment status");
        
        if (pollErrors >= 2) {
          // After 3 failures, offer manual verification
          setManualVerification(true);
        }
        
        setStatus("error");
        setLoading(false);
      }
    };
    
    // Helper function to try polling a payment status
    const tryPollingPaymentStatus = async (pollUrl) => {
      try {
        const pollResponse = await fetch('/api/paynow/poll-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pollUrl }),
        });
        
        const pollData = await pollResponse.json();
        console.log("Poll response:", pollData);
        
        // Handle polling errors
        if (pollData.error) {
          console.log("Poll error:", pollData.error);
          setPollErrors(prev => prev + 1);
          
          if (pollErrors >= 2) {
            // After 3 poll failures, offer manual verification
            setManualVerification(true);
          }
        } 
        // Check if paid using the paid property as returned from our API
        else if (pollData.paid === true) {
          console.log("Poll result: PAID");
          setStatus("paid");
          // Redirect to success page after 2 seconds
          setTimeout(() => {
            router.push(`/register/${router.query.id}/success`);
            // Clear payment info from localStorage
            localStorage.removeItem('paymentId');
            localStorage.removeItem('paymentTime');
          }, 2000);
        }
      } catch (pollError) {
        console.error("Error during polling:", pollError);
        setPollErrors(prev => prev + 1);
        
        if (pollErrors >= 2) {
          setManualVerification(true);
        }
      }
    };
    
    // Check immediately
    checkPaymentStatus();
    
    // Then set up an interval to check every 10 seconds
    const interval = setInterval(checkPaymentStatus, 10000);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, [router.isReady, router.query.id, email, router, pollErrors]);
  
  const handleManualVerification = async (e) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setErrorMessage("Please enter your payment reference code");
      return;
    }
    
    setLoading(true);
    
    try {
      // Call a new endpoint to verify the payment using the reference code
      const response = await fetch('/api/paynow/manual-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reference: verificationCode.trim(),
          eventId: router.query.id,
          email,
          name
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus("paid");
        // Redirect to success page after 2 seconds
        setTimeout(() => {
          router.push(`/register/${router.query.id}/success`);
        }, 2000);
      } else {
        setErrorMessage(result.error || "Could not verify payment");
        setLoading(false);
      }
    } catch (error) {
      console.error("Manual verification error:", error);
      setErrorMessage(error.message || "Error verifying payment");
      setLoading(false);
    }
  };
  
  if (loading) {
    return <Loading title="Checking payment status..." />;
  }
  
  if (!event.title) {
    return <ErrorPage />;
  }
  
  return (
    <div>
      <Head>
        <title>{`Payment Status | ${event.title}`}</title>
        <meta
          name="description"
          content="Payment status for your event ticket"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="w-full flex items-center justify-center min-h-[100vh] relative">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">{event.title}</h1>
          
          {status === "pending" && !manualVerification && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD95A] mx-auto mb-4"></div>
              <h2 className="text-xl font-medium mb-4">Payment Processing</h2>
              <p className="mb-4">
                We're waiting for confirmation of your payment from Paynow. This may take a moment.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                This page will automatically update when your payment is confirmed.
              </p>
            </div>
          )}
          
          {manualVerification && (
            <div className="text-center">
              <h2 className="text-xl font-medium mb-4">Verify Your Payment</h2>
              <p className="mb-4">
                We're having trouble automatically confirming your payment. Please enter the payment reference number from Paynow.
              </p>
              {errorMessage && (
                <p className="text-red-500 mb-4">{errorMessage}</p>
              )}
              <form onSubmit={handleManualVerification} className="mt-4">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Paynow reference number"
                  className="w-full px-4 py-2 border rounded-md mb-4"
                />
                <button
                  type="submit"
                  className="w-full bg-[#FFD95A] py-2 rounded-md font-medium"
                >
                  Verify Payment
                </button>
              </form>
            </div>
          )}
          
          {status === "paid" && (
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <h2 className="text-xl font-medium mb-4">Payment Successful!</h2>
              <p className="mb-4">
                Your payment has been confirmed and your ticket is being generated.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                You'll be redirected to the success page in a moment...
              </p>
            </div>
          )}
          
          {status === "error" && !manualVerification && (
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">✗</div>
              <h2 className="text-xl font-medium mb-4">Payment Error</h2>
              <p className="mb-4">
                We encountered an error checking your payment status.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                {errorMessage || "Please try again or contact support if the problem persists."}
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.reload()}
                  className="px-4 py-2 bg-gray-200 rounded-md"
                >
                  Retry
                </button>
                <Link href={`/register/${router.query.id}/${event.slug || 'register'}`}>
                  <span className="px-4 py-2 bg-[#FFD95A] rounded-md">Try Again</span>
                </Link>
              </div>
            </div>
          )}
          
          <div className="mt-8 text-center">
            <Link href="/">
              <span className="text-blue-600 hover:underline">Return to Home</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PendingPage; 