const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

/**
 * Generates a PDF ticket with QR code and event details
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
      // Create a document with custom size for ticket (narrower and shorter than A4)
      const doc = new PDFDocument({
        size: [595, 400], // Width x Height in points (smaller than A4)
        margin: 0, // No margins, we'll control padding manually
        info: {
          Title: `${title} - Ticket`,
          Author: 'RSRVD Events',
          Subject: 'Event Ticket',
        }
      });
      
      // Collect the PDF data in memory
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Background and border styling
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .lineWidth(1)
         .stroke();
      
      // Left separator line
      doc.moveTo(235, 0)
         .lineTo(235, doc.page.height)
         .lineWidth(1)
         .stroke();
      
      // Right separator line
      doc.moveTo(560, 0)
         .lineTo(560, doc.page.height)
         .lineWidth(1)
         .stroke();
      
      // Header section
      doc.rect(235, 0, 325, 130)
         .lineWidth(1)
         .stroke();
      
      // RSRVD EVENT TICKET Header
      doc.fontSize(24)
         .fillColor('#000')
         .font('Helvetica-Bold')
         .text('RSRVD EVENT TICKET', 235, 50, {
           width: 325,
           align: 'center'
         });
      
      // Event title - positioned directly below the header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(title, 235, 100, {
           width: 325,
           align: 'center'
         });
      
      // QR Code - centered in the main content area
      if (qrCodeData) {
        const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        
        // Draw QR code in the center of the ticket
        doc.image(Buffer.from(qrImage, 'base64'), 297, 155, {
          width: 200,
          height: 200
        });
      }
      
      // Ticket details - left side
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Name:', 65, 180);
      
      doc.font('Helvetica')
         .fontSize(14)
         .text(name, 185, 180, { align: 'right' });
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Passcode:', 65, 220);
         
      doc.font('Helvetica')
         .fontSize(14)
         .text(passcode, 185, 220, { align: 'right' });
      
      // Ticket details - right side
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Time:', 435, 180);
         
      doc.font('Helvetica')
         .fontSize(14)
         .text(time, 530, 180, { align: 'right' });
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Date:', 435, 220);
         
      doc.font('Helvetica')
         .fontSize(14)
         .text(date, 530, 220, { align: 'right' });
      
      // Footer with instructions
      doc.fontSize(8)
         .fillColor('#555')
         .font('Helvetica')
         .text('This ticket is your entry pass to the event. Please present this ticket (printed or digital) at the entrance.', 
           260, 360, {
           width: 300,
           align: 'right'
         });
      
      // Generation date
      doc.fontSize(8)
         .text(`Generated on ${new Date().toLocaleDateString()}`, 260, 380, {
           width: 300,
           align: 'right'
         });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}; 