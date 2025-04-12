import { doc, getDoc } from "@firebase/firestore";
import { db } from "../../../utils/firebase";
import { convertTo12HourFormat } from "../../../utils/timeFormat";

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Ticket ID is required' });
  }
  
  try {
    // Get ticket information from attendee database
    const [eventId, passcode] = id.split('-');
    
    if (!eventId || !passcode) {
      return res.status(400).json({ error: 'Invalid ticket ID format' });
    }
    
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventSnap.data();
    
    // Find the attendee with matching passcode
    const attendee = eventData.attendees.find(a => a.passcode === passcode);
    
    if (!attendee) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Create an HTML ticket that can be styled more effectively than PDF
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${eventData.title} - Ticket</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }
          
          body {
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          
          .ticket-container {
            width: 100%;
            max-width: 800px;
            height: 400px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            display: flex;
            overflow: hidden;
            position: relative;
          }
          
          .left-section {
            width: 40%;
            padding: 30px;
            position: relative;
            border-right: 1px dashed #ddd;
          }
          
          .ticket-info {
            margin-top: 100px;
          }
          
          .ticket-info .label {
            font-size: 16px;
            color: #777;
            margin-bottom: 5px;
          }
          
          .ticket-info .value {
            font-size: 18px;
            color: #333;
            font-weight: bold;
            margin-bottom: 20px;
          }
          
          .right-section {
            width: 60%;
            padding: 30px;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            text-align: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 28px;
            color: #333;
            margin-bottom: 10px;
          }
          
          .header h2 {
            font-size: 22px;
            color: #666;
          }
          
          .qr-code {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-grow: 1;
          }
          
          .qr-code img {
            width: 200px;
            height: 200px;
            border: 5px solid #333;
          }
          
          .footer {
            text-align: right;
            font-size: 12px;
            color: #999;
            margin-top: 20px;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .ticket-container {
              box-shadow: none;
              border: 1px solid #ddd;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="left-section">
            <div class="ticket-info">
              <div class="label">Name:</div>
              <div class="value">${attendee.name}</div>
              
              <div class="label">Passcode:</div>
              <div class="value">${attendee.passcode}</div>
              
              <div class="label">Time:</div>
              <div class="value">${convertTo12HourFormat(eventData.time)}</div>
              
              <div class="label">Date:</div>
              <div class="value">${eventData.date}</div>
            </div>
          </div>
          
          <div class="right-section">
            <div class="header">
              <h1>RSRVD EVENT TICKET</h1>
              <h2>${eventData.title}</h2>
            </div>
            
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${attendee.passcode}" alt="QR Code">
            </div>
            
            <div class="footer">
              <p>This ticket is your entry pass to the event. Please present it at the entrance.</p>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
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