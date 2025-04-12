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
 * @returns {Promise<Buffer>} - PDF data as buffer
 */
exports.generateTicketPdf = async (options) => {
  const { name, passcode, time, date, title, qrCodeData } = options;
  
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
          
          body, html {
            margin: 0;
            padding: 0;
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          }
          
          .ticket-container {
            width: 595px;
            height: 400px;
            position: relative;
            background: white;
            overflow: hidden;
            box-sizing: border-box;
            border: 1px solid #000;
            display: flex;
          }
          
          .ticket-left {
            width: 235px;
            height: 100%;
            padding: 20px;
            box-sizing: border-box;
            border-right: 1px solid #000;
          }
          
          .ticket-right {
            flex: 1;
            height: 100%;
            position: relative;
          }
          
          .ticket-header {
            height: 130px;
            padding: 20px;
            border-bottom: 1px solid #000;
            box-sizing: border-box;
            text-align: center;
          }
          
          .ticket-header h1 {
            margin: 0;
            padding: 0;
            font-size: 24px;
            font-weight: bold;
          }
          
          .ticket-header h2 {
            margin: 10px 0 0;
            padding: 0;
            font-size: 20px;
          }
          
          .ticket-detail {
            margin: 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .ticket-detail-label {
            font-weight: bold;
            font-size: 14px;
          }
          
          .ticket-detail-value {
            font-size: 14px;
            text-align: right;
          }
          
          .ticket-qr {
            display: flex;
            justify-content: center;
            align-items: center;
            height: calc(100% - 130px);
            position: relative;
          }
          
          .ticket-qr-inner {
            border: 4px solid #000;
            padding: 10px;
            background: white;
          }
          
          .ticket-qr img {
            width: 180px;
            height: 180px;
          }
          
          .ticket-footer {
            position: absolute;
            bottom: 10px;
            right: 10px;
            font-size: 8px;
            text-align: right;
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="ticket-left">
            <div class="ticket-detail">
              <div class="ticket-detail-label">Name:</div>
              <div class="ticket-detail-value">${name}</div>
            </div>
            <div class="ticket-detail">
              <div class="ticket-detail-label">Passcode:</div>
              <div class="ticket-detail-value">${passcode}</div>
            </div>
            <div class="ticket-detail">
              <div class="ticket-detail-label">Time:</div>
              <div class="ticket-detail-value">${time}</div>
            </div>
            <div class="ticket-detail">
              <div class="ticket-detail-label">Date:</div>
              <div class="ticket-detail-value">${date}</div>
            </div>
          </div>
          <div class="ticket-right">
            <div class="ticket-header">
              <h1>RSRVD EVENT TICKET</h1>
              <h2>${title}</h2>
            </div>
            <div class="ticket-qr">
              <div class="ticket-qr-inner">
                <img src="${qrCodeData}" alt="QR Code" />
              </div>
              <div class="ticket-footer">
                <p>This ticket is your entry pass to the event. Please present this ticket (printed or digital) at the entrance.</p>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script>
          // This script will run in the browser when the HTML is rendered
          window.onload = function() {
            // Wait a moment for fonts to load
            setTimeout(() => {
              const { jsPDF } = window.jspdf;
              
              html2canvas(document.querySelector('.ticket-container'), {
                scale: 2, // Higher scale for better quality
                useCORS: true, // To handle cross-origin images like the QR code
                logging: false
              }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                  orientation: 'landscape',
                  unit: 'px',
                  format: [595, 400]
                });
                
                pdf.addImage(imgData, 'PNG', 0, 0, 595, 400);
                pdf.save('${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ticket.pdf');
              });
            }, 500);
          }
        </script>
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
        size: [595, 400],
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
      
      // Draw the ticket container border
      doc.rect(0, 0, 595, 400).stroke();
      
      // Draw the vertical line separating the left and right sections
      doc.moveTo(235, 0).lineTo(235, 400).stroke();
      
      // Draw the horizontal line for the header
      doc.moveTo(235, 130).lineTo(595, 130).stroke();
      
      // Write the header text
      doc.font('Helvetica-Bold').fontSize(24)
         .text('RSRVD EVENT TICKET', 235, 50, {
           width: 360,
           align: 'center'
         });
      
      doc.font('Helvetica-Bold').fontSize(20)
         .text(title, 235, 90, {
           width: 360,
           align: 'center'
         });
      
      // Write the ticket details
      doc.font('Helvetica-Bold').fontSize(14)
         .text('Name:', 20, 40);
      
      doc.font('Helvetica').fontSize(14)
         .text(name, 235 - 20, 40, { align: 'right' });
      
      doc.font('Helvetica-Bold').fontSize(14)
         .text('Passcode:', 20, 80);
      
      doc.font('Helvetica').fontSize(14)
         .text(passcode, 235 - 20, 80, { align: 'right' });
      
      doc.font('Helvetica-Bold').fontSize(14)
         .text('Time:', 20, 120);
      
      doc.font('Helvetica').fontSize(14)
         .text(time, 235 - 20, 120, { align: 'right' });
      
      doc.font('Helvetica-Bold').fontSize(14)
         .text('Date:', 20, 160);
      
      doc.font('Helvetica').fontSize(14)
         .text(date, 235 - 20, 160, { align: 'right' });
      
      // Draw the QR code
      if (qrCodeData) {
        const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        
        // Draw border around QR code
        doc.rect(325, 165, 200, 200).lineWidth(4).stroke();
        
        // Draw the QR code image
        doc.image(Buffer.from(qrImage, 'base64'), 335, 175, {
          width: 180,
          height: 180
        });
      }
      
      // Add footer text
      doc.fontSize(8)
         .fillColor('#555')
         .font('Helvetica')
         .text('This ticket is your entry pass to the event. Please present this ticket (printed or digital) at the entrance.', 
           290, 380, {
           width: 300,
           align: 'right'
         });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}; 