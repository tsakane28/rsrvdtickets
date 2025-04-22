const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

/**
 * Gets the executable path for Chrome/Chromium based on the OS
 */
function getChromePath() {
  switch (os.platform()) {
    case 'darwin': // macOS
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'win32': // Windows
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    case 'linux': // Linux
      return '/usr/bin/google-chrome';
    default:
      return null;
  }
}

/**
 * Generates a PDF ticket with QR code and event details using Puppeteer
 * Creates a professional and modern design with HTML/CSS
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
  
  // Create a modern HTML template with clean design
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title} - Ticket</title>
      <style>
        /* Modern, clean font stack */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        
        .ticket-container {
          width: 600px;
          height: 220px;
          position: relative;
        }
        
        .ticket {
          position: absolute;
          top: 0;
          left: 0;
          width: 600px;
          height: 220px;
          display: flex;
          overflow: hidden;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          background-image: linear-gradient(to right, #0f0c29, #302b63, #24243e);
          color: white;
        }
        
        .content-area {
          flex: 1;
          padding: 20px 25px;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          margin-bottom: 16px;
        }
        
        .event-title {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 4px;
          color: #ffffff;
        }
        
        .event-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .detail-row {
          display: flex;
          align-items: baseline;
        }
        
        .datetime {
          color: #add6ff;
          font-size: 14px;
          margin-bottom: 12px;
        }
        
        .label {
          font-size: 11px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        
        .value {
          font-size: 14px;
          color: white;
        }
        
        .ticket-number {
          display: inline-block;
          padding: 4px 12px;
          background-color: rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .qr-section {
          width: 160px;
          background-color: #f7b733;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 0 12px 12px 0;
        }
        
        .qr-code-container {
          background-color: white;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        
        .qr-code {
          width: 100px;
          height: 100px;
          display: block;
        }
        
        .verified-badge {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: #0f0c29;
          background-color: white;
          padding: 3px 10px;
          border-radius: 12px;
          letter-spacing: 0.5px;
        }
        
        .divider {
          position: absolute;
          left: 0;
          top: 30px;
          bottom: 30px;
          width: 2px;
          background-image: repeating-linear-gradient(
            to bottom,
            white,
            white 4px,
            transparent 4px,
            transparent 8px
          );
        }
        
        .footer {
          margin-top: auto;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.6);
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="ticket">
          <div class="content-area">
            <div class="header">
              <div class="event-title">${title}</div>
              <div class="datetime">${date} • ${time}</div>
            </div>
            
            <div class="event-details">
              <div>
                <div class="label">Attendee</div>
                <div class="value">${name}</div>
              </div>
              
              <div>
                <div class="label">Ticket ID</div>
                <div class="ticket-number">${passcode}</div>
              </div>
            </div>
            
            <div class="footer">
              RSRVD Event Ticketing System
            </div>
          </div>
          
          <div class="qr-section">
            <div class="divider"></div>
            <div class="qr-code-container">
              <img class="qr-code" src="${qrCodeData}" alt="QR Code" />
            </div>
            <div class="verified-badge">Verified</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    // Get Chrome executable path
    const executablePath = getChromePath();
    
    if (!executablePath || !fs.existsSync(executablePath)) {
      throw new Error('Chrome executable not found');
    }
    
    // Launch browser
    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    
    // Create page and set content
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      width: '600px',
      height: '220px',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });
    
    await browser.close();
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF with Puppeteer:', error);
    
    // Fallback to PDFKit if Puppeteer fails
    console.log('Falling back to PDFKit...');
    
    return new Promise((resolve, reject) => {
      try {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: [600, 220],
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
        
        // Right section - orange
        doc.roundedRect(440, 0, 160, 220, 10, 0, 10, 0).fill('#f7b733');
        
        // Add event title
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff');
        doc.text(title, 30, 30, { width: 380 });
        
        // Add date and time
        doc.font('Helvetica').fontSize(14).fillColor('#add6ff');
        doc.text(`${date} • ${time}`, 30, 60, { width: 380 });
        
        // Add attendee info
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
        doc.text('ATTENDEE', 30, 90);
        
        doc.font('Helvetica').fontSize(14).fillColor('#ffffff');
        doc.text(name, 30, 110, { width: 380 });
        
        // Add ticket ID
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
        doc.text('TICKET ID', 30, 140);
        
        doc.roundedRect(30, 160, 150, 30, 15).fill('rgba(255, 255, 255, 0.15)');
        doc.font('Helvetica').fontSize(14).fillColor('#ffffff');
        doc.text(passcode, 45, 168);
        
        // Add divider
        doc.save();
        doc.strokeColor('white').opacity(0.5).lineWidth(2);
        doc.dash(6, 3);
        doc.moveTo(440, 30).lineTo(440, 190).stroke();
        doc.restore();
        
        // Add QR code section
        doc.roundedRect(460, 50, 120, 120, 8).fill('#ffffff');
        
        if (qrCodeData) {
          try {
            const qrImage = qrCodeData.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
            doc.image(Buffer.from(qrImage, 'base64'), 470, 60, {
              width: 100,
              height: 100
            });
          } catch (err) {
            console.error('Error adding QR code image:', err);
            doc.font('Helvetica').fontSize(12).fillColor('#000000');
            doc.text('QR Code unavailable', 470, 100, {
              width: 100,
              align: 'center'
            });
          }
        }
        
        // Add verified badge
        doc.roundedRect(480, 180, 80, 20, 10).fill('#ffffff');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f0c29');
        doc.text('VERIFIED', 490, 186);
        
        // Add footer
        doc.font('Helvetica').fontSize(8).fillColor('rgba(255, 255, 255, 0.6)');
        doc.text('RSRVD Event Ticketing System', 30, 200);
        
        // Finalize the PDF
        doc.end();
      } catch (err) {
        console.error('Error in PDFKit fallback:', err);
        reject(err);
      }
    });
  }
}; 