import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/**
 * Ticket verification page - displays when a QR code is scanned
 * Shows ticket status and attendee information
 */
export default function VerifyTicket() {
  const router = useRouter();
  const { id: ticketId, eventId, sig, ts } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [attendee, setAttendee] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyTicket = async () => {
      if (!ticketId || !router.isReady) return;
      
      try {
        setLoading(true);
        
        // Check if we have the necessary query parameters
        if (!sig || !ts) {
          setError("Invalid ticket: missing signature or timestamp");
          setLoading(false);
          return;
        }
        
        // Call the server-side API endpoint for secure verification
        const response = await fetch('/api/verify-ticket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId,
            eventId: eventId || '',
            signature: sig,
            timestamp: parseInt(ts, 10)
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.message || 'Error verifying ticket');
          setLoading(false);
          return;
        }
        
        if (data.success) {
          setVerified(true);
          setAttendee(data.attendee);
          setEvent(data.event);
        } else {
          setError(data.message || 'Ticket verification failed');
        }
      } catch (err) {
        console.error("Error verifying ticket:", err);
        setError("Error connecting to verification service");
      } finally {
        setLoading(false);
      }
    };

    verifyTicket();
  }, [ticketId, eventId, sig, ts, router.isReady]);

  const getPaymentStatus = () => {
    if (!attendee?.paymentStatus) return "Unknown";
    return attendee.paymentStatus;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Head>
        <title>RSRVD - Ticket Verification</title>
        <meta name="description" content="Verify ticket authenticity" />
        {/* CSP Header */}
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.google.com/recaptcha/; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.firebaseio.com;" />
        
        {/* Prevent XSS */}
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Prevent clickjacking */}
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        
        {/* Prevent MIME type sniffing */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        
        {/* Referrer Policy */}
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </Head>
      
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-center mb-4">
          <h1 className="text-2xl font-bold text-center mb-6">RSRVD</h1>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">Ticket Verification</h1>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
            <p className="mt-4">Verifying ticket...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : verified ? (
          <div>
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
              <p className="font-bold">Ticket is valid ✓</p>
              <p>This ticket has been verified successfully.</p>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h2 className="text-xl font-semibold mb-4">Attendee Information</h2>
              
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="font-medium">Name:</div>
                <div className="col-span-2">{attendee.name}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="font-medium">Email:</div>
                <div className="col-span-2">{attendee.email}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="font-medium">Ticket ID:</div>
                <div className="col-span-2">{attendee.passcode}</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Payment:</div>
                <div className="col-span-2">{getPaymentStatus()}</div>
              </div>
            </div>
            
            {event && (
              <div className="border-t border-gray-200 pt-4">
                <h2 className="text-xl font-semibold mb-4">Event Details</h2>
                
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="font-medium">Event:</div>
                  <div className="col-span-2">{event.title}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="font-medium">Date:</div>
                  <div className="col-span-2">{event.date}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div className="font-medium">Time:</div>
                  <div className="col-span-2">{event.time}</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium">Venue:</div>
                  <div className="col-span-2">{event.venue}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p className="font-bold">Invalid Ticket</p>
            <p>This ticket cannot be verified.</p>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>RSRVD Ticketing System</p>
          <p>Secure ticket verification system</p>
        </div>
      </div>
    </div>
  );
}