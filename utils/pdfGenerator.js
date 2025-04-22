const PDFDocument = require('pdfkit');

/**
 * Generates a PDF ticket with QR code and event details using PDFKit
 * With styling similar to the Tailwind CSS design
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
      // Create a new PDF document
      const doc = new PDFDocument({
        size: [600, 220],  // Sized for our ticket
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
      
      // Create gradient-like effect (PDFKit doesn't directly support CSS gradients)
      // Main background - dark blue to medium blue
      doc.rect(0, 0, 460, 220).fill('#302b63');
      doc.rect(0, 0, 230, 220).fill('#0f0c29');
      
      // Right section - orange background with rounded corner
      doc.roundedRect(460, 0, 140, 220, 10).fill('#f7b733');
      
      // Add the ticket title
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#ffffff');
      doc.text(title, 30, 50, { width: 380 });
      
      // Add the date and time
      doc.font('Helvetica').fontSize(14).fillColor('#add6ff');
      doc.text(`${date}, ${time}`, 30, 80, { width: 380 });
      
      // Add the attendee name with emoji
      doc.font('Helvetica').fontSize(14).fillColor('#ffffff');
      doc.text(`👤 :${name}`, 30, 110, { width: 380 });
      
      // Add the ticket ID with emoji
      doc.text(`🎟 :#${passcode}`, 30, 140, { width: 380 });
      
      // Draw the dashed divider line
      doc.save();
      doc.strokeColor('white').opacity(0.8);
      doc.dash(4, 4); // 4pt dash, 4pt gap
      doc.moveTo(460, 40).lineTo(460, 180).stroke();
      doc.restore();
      
      // Create a white rounded rectangle for the QR code
      doc.roundedRect(480, 60, 100, 100, 5).fill('#ffffff');
      
      // Add the QR code
      if (qrCodeData) {
        try {
          const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
          doc.image(Buffer.from(qrImage, 'base64'), 490, 70, {
            width: 80,
            height: 80
          });
        } catch (err) {
          console.error('Error adding QR code image:', err);
          // Fallback if QR code fails
          doc.font('Helvetica').fontSize(10).fillColor('#000000');
          doc.text('QR Code unavailable', 480, 110, { width: 100, align: 'center' });
        }
      }
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}; 