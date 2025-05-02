import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { ticketRateLimiter } from '../../middleware/rateLimit';
import { validateRequest } from '../../middleware/validateRequest';
import Joi from 'joi';
import crypto from 'crypto';

/**
 * API endpoint for ticket verification
 * Can be used by external systems to verify tickets
 */

// Validation schema for ticket verification
const verifyTicketSchema = Joi.object({
  ticketId: Joi.string().required().trim(),
  eventId: Joi.string().optional().trim(),
  signature: Joi.string().required(),
  timestamp: Joi.number().required()
});

// Middleware chain - rate limit first, then validate request
const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  
  try {
    const { ticketId, eventId, signature, timestamp } = req.body;
    
    // Validate timestamp (prevent replay attacks)
    const now = Date.now();
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    if (isNaN(timestamp) || (now - timestamp) > MAX_AGE) {
      return res.status(400).json({
        success: false,
        message: 'Ticket expired or invalid timestamp'
      });
    }
    
    // Verify signature using server-side secret
    const dataToVerify = `${ticketId}:${eventId || ''}:${timestamp}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.QR_SIGNATURE_KEY)
      .update(dataToVerify)
      .digest('hex');
      
    if (signature !== expectedSig) {
      console.warn(`Invalid signature attempt for ticket ${ticketId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid ticket signature'
      });
    }
    
    // If we made it here, signature is valid
    let attendee = null;
    let event = null;
    
    // If we have a specific eventId, check that event directly
    if (eventId) {
      const eventDoc = await getDoc(doc(db, "events", eventId));
      
      if (!eventDoc.exists()) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      const eventData = eventDoc.data();
      const foundAttendee = eventData.attendees?.find(
        (attendee) => attendee.passcode === ticketId
      );
      
      if (foundAttendee) {
        attendee = foundAttendee;
        event = {
          id: eventDoc.id,
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          venue: eventData.venue,
        };
      } else {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found for this event'
        });
      }
    } else {
      // Search all events for the ticket
      const eventsCollection = collection(db, "events");
      const eventsSnapshot = await getDocs(eventsCollection);
      
      let ticketFound = false;
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const foundAttendee = eventData.attendees?.find(
          (attendee) => attendee.passcode === ticketId
        );
        
        if (foundAttendee) {
          attendee = foundAttendee;
          event = {
            id: eventDoc.id,
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            venue: eventData.venue,
          };
          ticketFound = true;
          break;
        }
      }
      
      if (!ticketFound) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found in any event'
        });
      }
    }
    
    // If we got here, the ticket is valid
    return res.status(200).json({
      success: true,
      message: 'Ticket verified successfully',
      attendee: {
        name: attendee.name,
        email: attendee.email,
        passcode: attendee.passcode,
        paymentStatus: attendee.paymentInfo?.paid ? 'Paid' : 'Unpaid'
      },
      event
    });
    
  } catch (error) {
    console.error('Error verifying ticket:', error);
    
    // Return generic error to client
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the ticket'
    });
  }
};

// Apply middlewares
export default ticketRateLimiter(
  validateRequest(verifyTicketSchema)(handler)
); 