// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import nodemailer from 'nodemailer';
import { convertTo12HourFormat } from '../../utils/timeFormat';

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
		const { name, email, title, time, date, note, description, passcode, flier_url, qrCode } = req.body;

		if (!email || !title) {
			return res.status(400).json({ success: false, message: 'Missing required fields' });
		}

		// Create HTML content for the email
		const htmlContent = `
			<h2>You're registered for: ${title}</h2>
			<p><strong>Date:</strong> ${date}</p>
			<p><strong>Time:</strong> ${convertTo12HourFormat(time)}</p>
			<p><strong>Note:</strong> ${note || 'N/A'}</p>
			<p><strong>Description:</strong> ${description || 'N/A'}</p>
			<p><strong>Passcode:</strong> ${passcode}</p>
			${
				flier_url && flier_url !== "No flier for this event"
					? `<img src="${flier_url}" alt="Event Flier" style="max-width:100%"/>`
					: ""
			}
			${
				qrCode
					? `<p><strong>Scan this QR code at the event:</strong></p><img src="${qrCode}" alt="QR Code" style="width:200px"/>`
					: ""
			}
		`;

		// Send the email
		const info = await transporter.sendMail({
			from: '"RSRVD Events" <rsrvd@reserveddigitalbranding.com>',
			to: email,
			subject: `RSRVD Ticket: ${title}`,
			html: htmlContent,
		});

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
