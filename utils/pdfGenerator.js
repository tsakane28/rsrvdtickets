const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

/**
 * Generates a PDF ticket with QR code and event details using PDFKit
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
      // Create a simple PDF with PDFKit
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({
        size: [600, 240],  // Sized for our ticket
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
      
      // Set up background colors - simpler, flat colors for better reliability
      doc.rect(0, 0, 220, 240).fill('#0f0c29');  // Left area (dark blue)
      doc.rect(220, 0, 260, 240).fill('#302b63');  // Middle area (medium blue)
      doc.rect(480, 0, 120, 240).fill('#f7b733');  // Right area (orange)
      
      // Left section - Event name and details area
      doc.font('Helvetica-Bold').fontSize(24).fillColor('#fff');
      doc.text(title, 20, 40, { width: 180 });
      
      doc.font('Helvetica').fontSize(14).fillColor('#fff');
      doc.text(`${date}, ${time}`, 20, 100, { width: 180 });

      // Middle section - Attendee information
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#fff');
      doc.text("Ø=Ud", 240, 60);
      doc.text(`:${name}`, 290, 60, { width: 220 });
      
      doc.font('Helvetica').fontSize(14).fillColor('#fff');
      doc.text("Ø<tŸ", 240, 100);
      doc.text(`:#${passcode}`, 290, 100, { width: 220 });
      
      // Draw the divider
      doc.save();
      doc.strokeColor('white').opacity(0.8);
      doc.dash(4, 4); // 4pt dash, 4pt gap
      doc.moveTo(470, 40).lineTo(470, 200).stroke();
      doc.restore();
      
      // QR code in the right orange area
      if (qrCodeData) {
        const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        
        try {
          // Draw the QR code image with white background
          doc.roundedRect(500, 70, 100, 100, 5).fill('#ffffff');
          doc.image(Buffer.from(qrImage, 'base64'), 510, 80, {
            width: 80,
            height: 80
          });
        } catch (err) {
          console.error('Error adding QR code image:', err);
          // Fallback if QR code fails
          doc.roundedRect(500, 70, 100, 100, 5).fill('#ffffff');
          doc.font('Helvetica').fontSize(10).fillColor('#000');
          doc.text('QR Code unavailable', 510, 110, { width: 80, align: 'center' });
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