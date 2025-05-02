import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

/**
 * API endpoint for ticket verification
 * Can be used by external systems to verify tickets
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { ticketId, eventId } = req.body;

    // Validate required parameters
    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'Ticket ID is required' });
    }

    let verified = false;
    let attendee = null;
    let event = null;

    // If eventId is provided, search in that specific event
    if (eventId) {
      const eventDoc = await getDoc(doc(db, "events", eventId));
      
      if (!eventDoc.exists()) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      
      const eventData = eventDoc.data();
      const foundAttendee = eventData.attendees?.find(
        (attendee) => attendee.passcode === ticketId
      );
      
      if (foundAttendee) {
        verified = true;
        attendee = foundAttendee;
        event = {
          id: eventId,
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          venue: eventData.venue
        };
      }
    } else {
      // If no eventId, search in all events
      const eventsCollection = collection(db, "events");
      const eventsSnapshot = await getDocs(eventsCollection);
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const foundAttendee = eventData.attendees?.find(
          (attendee) => attendee.passcode === ticketId
        );
        
        if (foundAttendee) {
          verified = true;
          attendee = foundAttendee;
          event = {
            id: eventDoc.id,
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            venue: eventData.venue
          };
          break;
        }
      }
    }

    if (!verified) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Return verified ticket information
    return res.status(200).json({
      success: true,
      verified: true,
      attendee: {
        name: attendee.name,
        email: attendee.email,
        ticketId: attendee.passcode,
        paymentStatus: attendee.paymentInfo?.paid ? 'Paid' : 'Unpaid'
      },
      event: event
    });

  } catch (error) {
    console.error('Error verifying ticket:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
} 