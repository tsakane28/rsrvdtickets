const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

/**
 * Generates a PDF ticket with QR code and event details using jsPDF and html2canvas
 * This function creates an HTML template and converts it to PDF for better styling
 * 
 * @param {Object} options - Ticket options
 * @param {string} options.name - Attendee name
 * @param {string} options.passcode - Ticket passcode
 * @param {string} options.time - Event time
 * @param {string} options.date - Event date
 * @param {string} options.title - Event title
 * @param {string} options.qrCodeData - Base64 QR code data
 * @param {string} options.flyerUrl - URL to event flyer image (optional)
 * @returns {Promise<Buffer>} - PDF data as buffer
 */
exports.generateTicketPdf = async (options) => {
  const { name, passcode, time, date, title, qrCodeData, flyerUrl } = options;
  
  return new Promise((resolve, reject) => {
    try {
      // In a Node.js environment, we'll create a pre-rendered HTML string
      // that will be converted to PDF on the client side
      
      // This template uses inline styles for better rendering in PDF
      const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} - Ticket</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
          
          * {
            box-sizing: border-box;
          }

          body, html {
            margin: 0;
            padding: 0;
            font-family: 'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif;
            background-color: #f4f6f8;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .ticket {
            display: flex;
            width: 600px;
            height: 220px;
            background: linear-gradient(to right, #0f0c29, #302b63, #f7b733);
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
            padding-left: 0;
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
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="ticket-left">
            <div class="photo">
              ${flyerUrl ? `<img src="${flyerUrl}" alt="Event Flyer">` : 'Photo'}
            </div>
            <div class="ticket-info">
              <h2>${title}</h2>
              <div class="datetime">${date}, ${time}</div>
              <div class="name">👤 :${name}</div>
              <div class="ticket-id">🎟 :#${passcode}</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="ticket-right">
            <img src="${qrCodeData}" alt="QR Code" />
          </div>
        </div>
      </body>
      </html>
      `;
      
      // Since we're in a Node.js environment, we need to use a headless browser
      // or another method to render this HTML and convert it to PDF
      // For this implementation, we'll use a simplified approach with PDFKit
      
      // In a production environment, you'd use Puppeteer or a similar solution
      // to render the HTML and convert it to PDF
      
      // For now, let's create a simple PDF with PDFKit that resembles our design
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({
        size: [600, 260],  // Sized for our ticket
        margin: 0,
        info: {
          Title: `${title} - Ticket`,
          Author: 'RSRVD Events',
          Subject: 'Event Ticket',
        }
      });
      
      // Collect the PDF data
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Set up gradient background (approximation as PDFKit doesn't support CSS gradients directly)
      doc.rect(0, 0, 480, 220).fill('#302b63');  // Main ticket area with mid-gradient color
      
      // Draw gradient effect manually with color bands
      doc.rect(0, 0, 160, 220).fill('#0f0c29');  // Left side, darker color
      doc.rect(320, 0, 160, 220).fill('#f7b733');  // Right side, orange color
      
      // Photo area - If flyer image exists, add it
      if (flyerUrl) {
        doc.save();
        // Create a clipping path for the curved rectangle
        doc.roundedRect(0, 0, 160, 220, 5, 50, 50, 5).clip();
        
        try {
          // Try to add the image, with fallback if it fails
          doc.image(flyerUrl, 0, 0, {
            width: 160,
            height: 220,
            fit: [160, 220]
          });
        } catch (err) {
          console.error('Error adding flyer image:', err);
          // If image can't be loaded, create a placeholder
          doc.rect(0, 0, 160, 220).fill('#e0e0e0');
          doc.font('Helvetica-Bold').fontSize(18).fillColor('#222');
          doc.text('Photo', 60, 100, {
            align: 'center',
            width: 40
          });
        }
        doc.restore();
      } else {
        // No image, create a placeholder
        doc.save();
        doc.roundedRect(0, 0, 160, 220, 5, 50, 50, 5).fill('#e0e0e0');
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#222');
        doc.text('Photo', 60, 100, {
          align: 'center',
          width: 40
        });
        doc.restore();
      }
      
      // Main ticket information (right side of photo)
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#fff');
      doc.text(title, 170, 70, {
        width: 250
      });
      
      doc.font('Helvetica').fontSize(14).fillColor('#add6ff');
      doc.text(`${date}, ${time}`, 170, 100, {
        width: 250
      });
      
      doc.font('Helvetica').fontSize(14).fillColor('#fff');
      doc.text(`👤 :${name}`, 170, 125, {
        width: 250
      });
      
      doc.font('Helvetica').fontSize(14).fillColor('#fff');
      doc.text(`🎟 :#${passcode}`, 170, 150, {
        width: 250
      });
      
      // Draw the divider
      doc.save();
      // Create a dashed line for the divider
      doc.strokeColor('white').opacity(0.8);
      doc.dash(4, 4); // 4pt dash, 4pt gap
      doc.moveTo(470, 40).lineTo(470, 180).stroke();
      doc.restore();
      
      // Right section with QR code
      doc.rect(480, 0, 120, 220).fill('#ffffff');
      
      // Draw the QR code
      if (qrCodeData) {
        const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        
        // Draw the QR code image
        doc.image(Buffer.from(qrImage, 'base64'), 490, 60, {
          width: 100,
          height: 100
        });
      }
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}; 