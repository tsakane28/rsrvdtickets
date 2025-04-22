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
 * Uses a custom background image with modern design elements
 * 
 * @param {Object} options - Ticket options
 * @param {string} options.name - Attendee name
 * @param {string} options.passcode - Ticket passcode
 * @param {string} options.time - Event time
 * @param {string} options.date - Event date
 * @param {string} options.title - Event title
 * @param {string} options.qrCodeData - Base64 QR code data
 * @param {string} options.backgroundImage - Optional custom background image (base64)
 * @returns {Promise<Buffer>} - PDF data as buffer
 */
exports.generateTicketPdf = async (options) => {
  const { name, passcode, time, date, title, qrCodeData, backgroundImage } = options;
  
  // Path to the background image in public directory
  const backgroundImagePath = '/veri/tickback.png';
  
  // Create a modern HTML template with custom background image
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
      color: white;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    
    .ticket-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    
    .content-area {
      flex: 1;
      padding: 20px 25px;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 2;
      /* Remove the dark overlay to show background image clearly */
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
      color: rgb(48, 192, 23);
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    
    .value {
      font-size: 14px;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    
    .ticket-number {
      display: inline-block;
      margin-top: 5px;
      margin-left: 3px;
      padding: 6px 12px;
      background-color: white;
      color: black;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .qr-section {
      width: 160px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
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
    
    /* The verified badge is already in the background image */
    .verified-badge {
      display: none;
    }
    
    .divider {
      display: none; /* No need for divider as it's part of the background */
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
      <img class="ticket-background" src="${backgroundImagePath}" alt="Ticket Background" />
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
        <div class="qr-code-container">
          <img class="qr-code" src="${qrCodeData}" alt="QR Code" />
        </div>
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
        
        // Try to use background image from file system
        try {
          // For PDFKit, we need to use the file from the file system
          const bgImagePath = path.join(process.cwd(), 'public', 'veri', 'tickback.png');
          
          if (fs.existsSync(bgImagePath)) {
            doc.image(bgImagePath, 0, 0, {
              width: 600,
              height: 220
            });
          } else {
            console.error('Background image not found at:', bgImagePath);
            // Fallback to original gradient design
            doc.rect(0, 0, 600, 220).fill('#302b63');
            doc.rect(0, 0, 230, 220).fill('#0f0c29');
            doc.roundedRect(440, 0, 160, 220, 10, 0, 10, 0).fill('#f7b733');
          }
        } catch (err) {
          console.error('Error adding background image:', err);
          // Fallback to original design
          doc.rect(0, 0, 600, 220).fill('#302b63');
          doc.rect(0, 0, 230, 220).fill('#0f0c29');
          doc.roundedRect(440, 0, 160, 220, 10, 0, 10, 0).fill('#f7b733');
        }
        
        // Add event title
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff');
        doc.text(title, 30, 30, { width: 380 });
        
        // Add date and time
        doc.font('Helvetica').fontSize(14).fillColor('#add6ff');
        doc.text(`${date} • ${time}`, 30, 60, { width: 380 });
        
        // Add attendee info
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#30c017'); // Green color to match HTML
        doc.text('ATTENDEE', 30, 90);
        
        doc.font('Helvetica').fontSize(14).fillColor('#ffffff');
        doc.text(name, 30, 110, { width: 380 });
        
        // Add ticket ID
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#30c017'); // Green color to match HTML
        doc.text('TICKET ID', 30, 140);
        
        // Change to white background with black text for ticket ID
        doc.roundedRect(30, 160, 150, 30, 15).fill('#ffffff');
        doc.font('Helvetica').fontSize(14).fillColor('#000000'); // Black text
        doc.text(passcode, 45, 168);
        
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