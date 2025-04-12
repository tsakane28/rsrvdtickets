// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import nodemailer from 'nodemailer';
import { convertTo12HourFormat } from '../../utils/timeFormat';
const { generateTicketPdf } = require('../../utils/pdfGenerator');

// Create reusable transporter
let transporter;
try {
	transporter = nodemailer.createTransport({
		host: process.env.EMAIL_HOST,
		port: parseInt(process.env.EMAIL_PORT),
		secure: false,
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS,
		},
	});
} catch (error) {
	console.error("Failed to create email transporter:", error);
}

export default async function handler(req, res) {
	// Only allow POST requests
	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, message: 'Method not allowed' });
	}

	// Check if transporter is initialized
	if (!transporter) {
		console.error("Email transporter is not initialized");
		return res.status(500).json({ 
			success: false, 
			message: 'Email service not configured properly' 
		});
	}

	try {
		// Extract email data from request body
		const { name, email, title, time, date, note, description, passcode, flier_url, qrCode, event_id } = req.body;

		if (!email || !title) {
			return res.status(400).json({ success: false, message: 'Missing required fields' });
		}

		// Generate PDF ticket
		const formattedTime = convertTo12HourFormat(time);
		const pdfBuffer = await generateTicketPdf({
			name,
			passcode,
			time: formattedTime,
			date,
			title,
			qrCodeData: qrCode
		});

		// Create the ticket URL for HTML version
		const ticketUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://rsrvdtickets.vercel.app'}/api/ticket/${event_id}-${passcode}`;

		// Create HTML content for the email
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Event Registration</title>
				<style>
					body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background-color: #FFD95A; color: #333; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
					.content { padding: 30px; background: white; border: 1px solid #eee; border-top: none; border-radius: 0 0 5px 5px; }
					.footer { background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; border-radius: 5px; margin-top: 20px; }
					.ticket-button { text-align: center; margin: 30px 0; }
					.ticket-button a { 
						background-color: #C07F00; 
						color: white; 
						padding: 12px 25px; 
						text-decoration: none; 
						border-radius: 5px;
						font-weight: bold;
						display: inline-block;
						margin: 0 10px;
					}
					.ticket-button a.secondary {
						background-color: #555;
					}
					.ticket-info {
						background-color: #f9f9f9;
						border: 1px solid #ddd;
						padding: 20px;
						border-radius: 5px;
						margin-bottom: 20px;
					}
					.ticket-info p {
						margin: 10px 0;
					}
					h1 { color: #333; }
					h2 { color: #555; margin-top: 30px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>You're registered for: ${title}</h1>
					</div>
					<div class="content">
						<div class="ticket-info">
							<p><strong>Name:</strong> ${name}</p>
							<p><strong>Date:</strong> ${date}</p>
							<p><strong>Time:</strong> ${formattedTime}</p>
							<p><strong>Note:</strong> ${note || 'N/A'}</p>
							<p><strong>Description:</strong> ${description || 'N/A'}</p>
							<p><strong>Passcode:</strong> ${passcode}</p>
						</div>
						
						<h2>Your Ticket</h2>
						<p>Your ticket is attached to this email and can also be viewed online. You can download, print, or show it on your device at the event.</p>
						
						<div class="ticket-button">
							<a href="${ticketUrl}" target="_blank">View Online Ticket</a>
							<a href="cid:ticket.pdf" class="secondary">View PDF Ticket</a>
						</div>

						${
							flier_url && flier_url !== "No flier for this event"
								? `<div class="flier">
									<h2>Event Flier</h2>
									<img src="${flier_url}" alt="Event Flier" style="max-width:100%; border: 1px solid #ddd; border-radius: 5px;">
								  </div>`
								: ""
						}
					</div>
					<div class="footer">
						<p>RSRVD Events | &copy; ${new Date().getFullYear()}</p>
						<p>If you have any questions, please contact the event organizer.</p>
					</div>
				</div>
			</body>
			</html>
		`;

		// Create the email options with PDF ticket attachment
		const mailOptions = {
			from: '"RSRVD Events" <rsrvd@reserveddigitalbranding.com>',
			to: email,
			subject: `RSRVD Ticket: ${title}`,
			html: htmlContent,
			attachments: [
				{
					filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ticket.pdf`,
					content: pdfBuffer,
					contentType: 'application/pdf',
					cid: 'ticket.pdf' // Content ID for referencing in the HTML
				}
			]
		};

		// If flier URL exists, add it as an attachment
		if (flier_url && flier_url !== "No flier for this event") {
			mailOptions.attachments.push({
				filename: 'event_flier.jpg',
				path: flier_url,
				cid: 'flier@rsrvd.com'
			});
			
			// Replace the flier URL with the Content ID reference in the HTML
			mailOptions.html = mailOptions.html.replace(flier_url, 'cid:flier@rsrvd.com');
		}

		// Send the email
		const info = await transporter.sendMail(mailOptions);

		console.log("✅ Email sent to", email, "Message ID:", info.messageId);
		
		// Return success response
		return res.status(200).json({ success: true, message: 'Email sent successfully' });
	} catch (error) {
		console.error("❌ Failed to send email:", error);
		return res.status(500).json({ 
			success: false, 
			message: `Failed to send email: ${error.message}` 
		});
	}
}
