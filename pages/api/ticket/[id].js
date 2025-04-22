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
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', 'Segoe UI', Roboto, sans-serif;
            background-color: #f4f6f8;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 40px;
          }
          
          .ticket-divider {
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
          
          @media print {
            body {
              padding: 0;
            }
            
            .print-info {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="flex flex-col items-center">
          <div class="flex w-[600px] h-[220px] overflow-hidden rounded-xl shadow-lg" style="background: linear-gradient(to right, #0f0c29, #302b63, #f7b733);">
            <div class="flex flex-grow items-center gap-5 p-5">
              <div class="flex flex-col">
                <h2 class="text-xl font-semibold text-white m-0">${eventData.title}</h2>
                <div class="text-sm text-[#add6ff] my-1">${eventData.date}, ${convertTo12HourFormat(eventData.time)}</div>
                <div class="text-sm text-white my-0.5">👤 :${attendee.name}</div>
                <div class="text-sm text-white my-0.5">🎟 :#${attendee.passcode}</div>
              </div>
            </div>
            
            <div class="ticket-divider"></div>
            
            <div class="flex w-[140px] items-center justify-center bg-white rounded-r-xl">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${attendee.passcode}" alt="QR Code" class="w-[100px] h-[100px]" />
            </div>
          </div>
          
          <div class="mt-8 text-center text-gray-600">
            <p class="text-sm">This is your ticket for the event. Please present it at the entrance.</p>
            <button onclick="window.print()" class="mt-4 px-6 py-2 bg-[#302b63] text-white rounded-md hover:bg-[#1f1b45] transition-colors cursor-pointer">
              Print Ticket
            </button>
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