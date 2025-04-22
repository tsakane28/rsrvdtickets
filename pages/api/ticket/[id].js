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
            height: 240px;
            overflow: hidden;
            color: #fff;
            border-radius: 8px;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          }

          .ticket-left {
            width: 220px;
            height: 100%;
            background-color: #0f0c29;
            padding: 20px;
            display: flex;
            flex-direction: column;
          }

          .ticket-left h2 {
            margin: 20px 0;
            font-size: 24px;
            font-weight: 600;
          }

          .ticket-left .datetime {
            font-size: 14px;
            margin-top: 40px;
          }

          .ticket-middle {
            width: 260px;
            height: 100%;
            background-color: #302b63;
            padding: 20px;
            position: relative;
          }

          .attendee-info {
            margin-top: 40px;
          }

          .attendee-info .label {
            font-size: 16px;
            font-weight: bold;
          }

          .attendee-info .value {
            font-size: 16px;
            margin-left: 10px;
          }

          .divider {
            position: absolute;
            right: 0;
            top: 40px;
            bottom: 40px;
            width: 2px;
            background: repeating-linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.8),
              rgba(255, 255, 255, 0.8) 4px,
              transparent 4px,
              transparent 8px
            );
          }

          .ticket-right {
            width: 120px;
            height: 100%;
            background-color: #f7b733;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-container {
            background-color: white;
            padding: 10px;
            border-radius: 5px;
          }

          .qr-container img {
            width: 80px;
            height: 80px;
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
              <h2>${eventData.title}</h2>
              <div class="datetime">${eventData.date}, ${convertTo12HourFormat(eventData.time)}</div>
            </div>
            <div class="ticket-middle">
              <div class="attendee-info">
                <div>
                  <span class="label">Ø=Ud</span>
                  <span class="value">:${attendee.name}</span>
                </div>
                <div style="margin-top: 20px;">
                  <span class="label">Ø<tŸ</span>
                  <span class="value">:#${attendee.passcode}</span>
                </div>
              </div>
              <div class="divider"></div>
            </div>
            <div class="ticket-right">
              <div class="qr-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${attendee.passcode}" alt="QR Code" />
              </div>
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