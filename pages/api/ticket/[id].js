import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../../utils/firebase";
import { convertTo12HourFormat } from "../../../utils/timeFormat";

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    console.error("Missing ticket ID");
    return res.status(400).json({ error: 'Ticket ID is required' });
  }
  
  try {
    // Get ticket information from attendee database
    // Parse the ID to get event ID and passcode
    const parts = id.split('-');
    
    if (parts.length < 2) {
      console.error("Invalid ticket ID format:", id);
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }
    
    // The passcode might contain hyphens, so join all parts after the first one
    const eventId = parts[0];
    const passcode = parts.slice(1).join('-');
    
    console.log("Parsed ticket ID:", { eventId, passcode });
    
    if (!eventId || !passcode) {
      console.error("Missing eventId or passcode after parsing");
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }
    
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      console.error("Event not found:", eventId);
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventSnap.data();
    
    // Find the attendee with matching passcode
    const attendee = eventData.attendees.find(a => a.passcode === passcode);
    
    if (!attendee) {
      console.error("Attendee with passcode not found:", passcode);
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Create an HTML ticket that can be styled more effectively than PDF
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${eventData.title} - Ticket</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f6f8;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 40px;
            min-height: 100vh;
          }

          .ticket {
            display: flex;
            width: 600px;
            height: 220px;
            background: linear-gradient(to right, #0f0c29, #302b63, #f7b733); /* Gradient from left to right */
            border-radius: 12px;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            color: #fff;
          }

          .ticket-left {
            display: flex;
            flex: 2.5;
            align-items: center;
            gap: 20px;
            position: relative;
          }

          .photo {
            width: 160px;
            height: 220px;
            border-radius: 5% 50% 50% 5%;
            background-color: #e0e0e0;
            color: #222;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            overflow: hidden;
          }

          .photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .ticket-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .ticket-info h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
          }

          .ticket-info .datetime {
            font-size: 14px;
            color: #add6ff;
            margin: 4px 0;
          }

          .ticket-info .name,
          .ticket-info .ticket-id {
            font-size: 14px;
            margin: 2px 0;
          }

          .divider {
            width: 2px;
            height: 80%;
            align-self: center;
            background: repeating-linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.8),
              rgba(255, 255, 255, 0.8) 4px,
              transparent 4px,
              transparent 8px
            );
            box-shadow: 0 0 2px rgba(255, 255, 255, 0.4);
            filter: blur(0.3px);
            mix-blend-mode: screen;
          }

          .ticket-right {
            flex: 1.2;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #ffffff;
          }

          .ticket-right img {
            width: 100px;
            height: 100px;
          }
          
          .print-info {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          
          .print-button {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 16px;
            background-color: #302b63;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .print-info {
              display: none;
            }
            
            .ticket {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div>
          <div class="ticket">
            <div class="ticket-left">
              <div class="photo">
                ${eventData.flier_url && eventData.flier_url !== "No flier for this event" ? 
                  `<img src="${eventData.flier_url}" alt="Event Flyer">` : 'Photo'}
              </div>
              <div class="ticket-info">
                <h2>${eventData.title}</h2>
                <div class="datetime">${eventData.date}, ${convertTo12HourFormat(eventData.time)}</div>
                <div class="name">👤 :${attendee.name}</div>
                <div class="ticket-id">🎟 :#${attendee.passcode}</div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="ticket-right">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${attendee.passcode}" alt="QR Code" />
            </div>
          </div>
          
          <div class="print-info">
            <p>This is your ticket for the event. Please present it at the entrance.</p>
            <button class="print-button" onclick="window.print()">Print Ticket</button>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Set the content type to HTML
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error generating ticket:', error);
    res.status(500).json({ error: 'Failed to generate ticket' });
  }
} 