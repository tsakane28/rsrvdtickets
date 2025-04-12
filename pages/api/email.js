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
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Event Registration</title>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background-color: #FFD95A; color: #333; padding: 20px; text-align: center; }
					.content { padding: 20px; }
					.footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
					img { max-width: 100%; height: auto; }
					.qr-code { text-align: center; margin: 20px 0; }
					.passcode { font-size: 20px; font-weight: bold; background-color: #f0f0f0; padding: 10px; text-align: center; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>You're registered for: ${title}</h1>
					</div>
					<div class="content">
						<p><strong>Date:</strong> ${date}</p>
						<p><strong>Time:</strong> ${convertTo12HourFormat(time)}</p>
						<p><strong>Note:</strong> ${note || 'N/A'}</p>
						<p><strong>Description:</strong> ${description || 'N/A'}</p>
						<div class="passcode">Passcode: ${passcode}</div>
						
						${
							qrCode
								? `<div class="qr-code">
									<p><strong>Scan this QR code at the event:</strong></p>
									<img src="${qrCode}" alt="QR Code" style="width:200px; border: 1px solid #ddd;">
								  </div>`
								: ""
						}

						${
							flier_url && flier_url !== "No flier for this event"
								? `<div class="flier">
									<p><strong>Event Flier:</strong></p>
									<img src="${flier_url}" alt="Event Flier" style="max-width:100%; border: 1px solid #ddd;">
								  </div>`
								: ""
						}
					</div>
					<div class="footer">
						<p>RSRVD Events | &copy; ${new Date().getFullYear()}</p>
					</div>
				</div>
			</body>
			</html>
		`;

		// Create the email options with attachments for Gmail compatibility
		const mailOptions = {
			from: '"RSRVD Events" <rsrvd@reserveddigitalbranding.com>',
			to: email,
			subject: `RSRVD Ticket: ${title}`,
			html: htmlContent,
			attachments: []
		};

		// If QR code exists, add it as an attachment and update the HTML to use the attachment cid
		if (qrCode) {
			const qrCodeAttachment = {
				filename: 'qrcode.png',
				path: qrCode,
				cid: 'qrcode@rsrvd.com' // Content ID to reference the attachment in the HTML
			};
			mailOptions.attachments.push(qrCodeAttachment);
			// Replace the QR code data URL with the Content ID reference
			mailOptions.html = mailOptions.html.replace(qrCode, 'cid:qrcode@rsrvd.com');
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
