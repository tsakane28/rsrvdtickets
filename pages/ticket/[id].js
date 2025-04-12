import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import { convertTo12HourFormat } from "../../utils/timeFormat";
import ErrorPage from '../../components/ErrorPage';
import Loading from '../../components/Loading';

// Server-side rendering to get ticket data
export async function getServerSideProps(context) {
  try {
    const { id } = context.params;
    
    if (!id) {
      console.error("Missing ticket ID");
      return { props: { error: 'Ticket ID is required' } };
    }
    
    // Parse the ID to get event ID and passcode
    const parts = id.split('-');
    
    if (parts.length < 2) {
      console.error("Invalid ticket ID format:", id);
      return { props: { error: 'Invalid ticket ID format', debug: { id } } };
    }
    
    // The passcode might contain hyphens, so join all parts after the first one
    const eventId = parts[0];
    const passcode = parts.slice(1).join('-');
    
    console.log("Parsed ticket ID:", { eventId, passcode });
    
    if (!eventId || !passcode) {
      console.error("Missing eventId or passcode after parsing");
      return { props: { error: 'Invalid ticket ID format', debug: { eventId, passcode } } };
    }
    
    // Get event data
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      console.error("Event not found:", eventId);
      return { props: { error: 'Event not found', debug: { eventId } } };
    }
    
    const eventData = eventSnap.data();
    
    // Find the attendee with the matching passcode
    const attendee = eventData.attendees.find(a => a.passcode === passcode);
    
    if (!attendee) {
      console.error("Attendee with passcode not found:", passcode);
      return { props: { error: 'Ticket not found', debug: { passcode } } };
    }
    
    // Return the ticket data
    return {
      props: {
        ticket: {
          name: attendee.name,
          passcode: attendee.passcode,
          event: {
            id: eventId,
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            note: eventData.note || '',
            description: eventData.description || '',
            flier_url: eventData.flier_url || null
          }
        }
      }
    };
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return { props: { error: 'Failed to load ticket', debug: { error: error.message } } };
  }
}

const TicketPage = ({ ticket, error, debug }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading for better UX (optional)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle errors
  if (error) {
    console.error("Error rendering ticket page:", error, debug);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Ticket Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          {debug && process.env.NODE_ENV === 'development' && (
            <pre className="bg-gray-100 p-4 rounded text-left text-xs overflow-auto max-h-40">
              {JSON.stringify(debug, null, 2)}
            </pre>
          )}
          <button 
            onClick={() => router.push('/')} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Show loading state
  if (loading) {
    return <Loading title="Loading your ticket..." />;
  }
  
  // Format the time
  const formattedTime = convertTo12HourFormat(ticket.event.time);
  
  return (
    <>
      <Head>
        <title>{ticket.event.title} - Ticket</title>
        <meta name="description" content={`Your ticket for ${ticket.event.title}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-lg overflow-hidden shadow-xl">
          {/* Ticket Header */}
          <div className="bg-[#FFD95A] p-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RSRVD EVENT TICKET</h1>
            <h2 className="text-xl text-gray-800">{ticket.event.title}</h2>
          </div>
          
          {/* Ticket Content */}
          <div className="flex flex-col md:flex-row">
            {/* Left Column - Attendee Info */}
            <div className="md:w-2/5 p-6 border-b md:border-b-0 md:border-r border-dashed border-gray-300">
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Name</p>
                <p className="text-gray-900 font-bold text-xl">{ticket.name}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Passcode</p>
                <p className="text-gray-900 font-bold text-xl">{ticket.passcode}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Date</p>
                <p className="text-gray-900 font-bold text-xl">{ticket.event.date}</p>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Time</p>
                <p className="text-gray-900 font-bold text-xl">{formattedTime}</p>
              </div>
            </div>
            
            {/* Right Column - QR Code */}
            <div className="md:w-3/5 p-6 flex flex-col items-center justify-center">
              <div className="bg-white p-3 border-4 border-gray-800 mb-6">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket.passcode}`} 
                  alt="QR Code" 
                  className="w-40 h-40 md:w-52 md:h-52"
                />
              </div>
              
              <p className="text-sm text-gray-600 text-center max-w-md">
                This ticket is your entry pass to the event. Please present this ticket (printed or digital) at the entrance.
              </p>
            </div>
          </div>
          
          {/* Ticket Footer */}
          <div className="bg-gray-50 px-6 py-4 text-right">
            <p className="text-xs text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => window.print()} 
            className="bg-[#C07F00] hover:bg-[#A06700] text-white font-bold py-2 px-4 rounded"
          >
            Print Ticket
          </button>
          
          <button 
            onClick={() => router.push('/')} 
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    </>
  );
};

export default TicketPage; 