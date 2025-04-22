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
  const router = useRouter();
  const { name, email } = router.query;
  
  // Check payment status on load
  useEffect(() => {
    if (!router.isReady) return;
    
    const checkPaymentStatus = async () => {
      try {
        // Try to get the payment reference from our database using event_id and email
        const response = await fetch(`/api/check-payment-status?event_id=${router.query.id}&email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.status === "paid") {
          setStatus("paid");
          // Redirect to success page after 2 seconds
          setTimeout(() => {
            router.push(`/register/${router.query.id}/success`);
          }, 2000);
        } else if (data.status === "pending" && data.pollUrl) {
          // We have a poll URL, so check payment status using our server API
          const pollResponse = await fetch('/api/paynow/poll-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pollUrl: data.pollUrl }),
          });
          
          const paymentStatus = await pollResponse.json();
          
          if (paymentStatus.paid) {
            setStatus("paid");
            // Redirect to success page after 2 seconds
            setTimeout(() => {
              router.push(`/register/${router.query.id}/success`);
            }, 2000);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error checking payment status:", error);
        setStatus("error");
        setLoading(false);
      }
    };
    
    // Check immediately
    checkPaymentStatus();
    
    // Then set up an interval to check every 10 seconds
    const interval = setInterval(checkPaymentStatus, 10000);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, [router.isReady, router.query.id, email, router]);
  
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
          
          {status === "pending" && (
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
          
          {status === "error" && (
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">✗</div>
              <h2 className="text-xl font-medium mb-4">Payment Error</h2>
              <p className="mb-4">
                We encountered an error checking your payment status.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Please try again or contact support if the problem persists.
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