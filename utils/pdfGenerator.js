const PDFDocument = require('pdfkit');

/**
 * Generates a PDF ticket with QR code and event details using PDFKit
 * Creates a professional and modern design
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
      
      // Modern design with gradient-like effect
      // Main background - medium blue
      doc.rect(0, 0, 600, 220).fill('#302b63');
      
      // Left side - darker blue
      doc.rect(0, 0, 230, 220).fill('#0f0c29');
      
      // Right side - orange section
      doc.roundedRect(440, 0, 160, 220, 10, 0, 10, 0).fill('#f7b733');
      
      // Add a modern header bar
      doc.roundedRect(20, 20, 400, 40, 5).fill('#252148');
      
      // Add event title in header
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff');
      doc.text(title, 30, 30, { width: 380 });
      
      // Add event details section
      doc.roundedRect(20, 70, 190, 130, 5).fill('rgba(255, 255, 255, 0.1)');
      
      // Add event date and time
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff');
      doc.text('DATE & TIME', 30, 80);
      
      doc.font('Helvetica').fontSize(14).fillColor('#add6ff');
      doc.text(`${date}`, 30, 100);
      doc.text(`${time}`, 30, 120);
      
      // Add attendee info section
      doc.roundedRect(240, 70, 180, 130, 5).fill('rgba(255, 255, 255, 0.1)');
      
      // Add attendee name
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff');
      doc.text('ATTENDEE', 250, 80);
      
      doc.font('Helvetica').fontSize(14).fillColor('#ffffff');
      doc.text(name, 250, 100);
      
      // Add ticket ID with a modern badge
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff');
      doc.text('TICKET ID', 250, 130);
      
      // Create a badge for the ticket ID
      doc.roundedRect(250, 150, 160, 30, 15).fill('rgba(255, 255, 255, 0.2)');
      doc.font('Helvetica').fontSize(14).fillColor('#ffffff');
      doc.text(passcode, 260, 158);
      
      // Draw a stylish divider line between content and QR
      doc.save();
      doc.strokeColor('white').opacity(0.5).lineWidth(2);
      doc.dash(6, 3);
      doc.moveTo(430, 20).lineTo(430, 200).stroke();
      doc.restore();
      
      // Add QR code in a clean container
      doc.roundedRect(460, 50, 120, 120, 8).fill('#ffffff');
      
      // Add the QR code
      if (qrCodeData) {
        try {
          const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
          
          // Center the QR code in the white area
          doc.image(Buffer.from(qrImage, 'base64'), 470, 60, {
            width: 100,
            height: 100
          });
        } catch (err) {
          console.error('Error adding QR code image:', err);
          
          // Fallback if QR code fails
          doc.font('Helvetica').fontSize(12).fillColor('#000000');
          doc.text('QR Code unavailable', 470, 100, {
            width: 100,
            align: 'center'
          });
        }
      }
      
      // Add a decorative element
      doc.circle(460, 200, 8).fill('#ffffff');
      doc.circle(460, 20, 8).fill('#ffffff');
      
      // Add a stylish "VERIFIED" badge in the orange section
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
      doc.text('VERIFIED', 500, 180, {
        align: 'center'
      });
      
      // Subtle footer at the bottom
      doc.font('Helvetica').fontSize(8).fillColor('rgba(255, 255, 255, 0.7)');
      doc.text('RSRVD - Your Event Ticket System', 20, 200, {
        align: 'left'
      });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}; 