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
      // Create a document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
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
      
      // Add content to the ticket
      
      // Title and header
      doc.fontSize(24)
         .fillColor('#000')
         .font('Helvetica-Bold')
         .text('RSRVD EVENT TICKET', { align: 'center' });
      
      doc.moveDown();
      
      // Event title
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text(title, { align: 'center' });
      
      doc.moveDown(2);
      
      // QR Code (centered)
      if (qrCodeData) {
        const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        const imgWidth = 200;
        const imgHeight = 200;
        
        // Center the QR code on the page
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const xPosition = doc.page.margins.left + (pageWidth - imgWidth) / 2;
        
        doc.image(Buffer.from(qrImage, 'base64'), xPosition, doc.y, {
          width: imgWidth,
          height: imgHeight
        });
        
        doc.moveDown(0.5);
      }
      
      // Draw a border around the QR code
      const borderWidth = 220;
      const borderHeight = 220;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const xPosition = doc.page.margins.left + (pageWidth - borderWidth) / 2;
      const yPosition = doc.y - 210;
      
      doc.lineWidth(3)
         .rect(xPosition - 10, yPosition - 10, borderWidth + 20, borderHeight + 20)
         .stroke();
      
      doc.moveDown(2);
      
      // Ticket details in a two-column layout
      const detailsY = doc.y;
      
      // Left column
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Name:', doc.page.margins.left, detailsY);
      
      doc.font('Helvetica')
         .fontSize(14)
         .text(name, doc.page.margins.left + 90, detailsY);
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Passcode:', doc.page.margins.left, detailsY + 30);
         
      doc.font('Helvetica')
         .fontSize(14)
         .text(passcode, doc.page.margins.left + 90, detailsY + 30);
      
      // Right column
      const rightColumnX = doc.page.width / 2 + 20;
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Time:', rightColumnX, detailsY);
         
      doc.font('Helvetica')
         .fontSize(14)
         .text(time, rightColumnX + 50, detailsY);
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('Date:', rightColumnX, detailsY + 30);
         
      doc.font('Helvetica')
         .fontSize(14)
         .text(date, rightColumnX + 50, detailsY + 30);
      
      // Footer
      doc.moveDown(5);
      doc.fontSize(10)
         .fillColor('#555')
         .font('Helvetica')
         .text('This ticket is your entry pass to the event. Please present this ticket (printed or digital) at the entrance.', {
           align: 'center',
           width: 400,
           height: 100
         });
      
      doc.moveDown();
      doc.fontSize(10)
         .text(`Generated on ${new Date().toLocaleDateString()}`, {
           align: 'center'
         });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}; 