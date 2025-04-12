import nodemailer from "nodemailer";

export const sendEmail = async ({
	name,
	email,
	title,
	time,
	date,
	note,
	description,
	passcode,
	flier_url,
	qrCode, // optional base64 QR
}) => {
	const transporter = nodemailer.createTransport({
		host: "mail.reserveddigitalbranding.com",
		port: 587,
		secure: false,
		auth: {
			user: "rsrvd@reserveddigitalbranding.com",
			pass: "1979Tmw.",
		},
	});

	const htmlContent = `
		<h2>You're registered for: ${title}</h2>
		<p><strong>Date:</strong> ${date}</p>
		<p><strong>Time:</strong> ${time}</p>
		<p><strong>Note:</strong> ${note}</p>
		<p><strong>Description:</strong> ${description}</p>
		<p><strong>Passcode:</strong> ${passcode}</p>
		${
			flier_url !== "No flier for this event"
				? `<img src="${flier_url}" alt="Event Flier" style="max-width:100%"/>`
				: ""
		}
		${
			qrCode
				? `<p><strong>Scan this QR code at the event:</strong></p><img src="${qrCode}" alt="QR Code" style="width:200px"/>`
				: ""
		}
	`;

	try {
		await transporter.sendMail({
			from: '"RSRVD Events" <rsrvd@reserveddigitalbranding.com>',
			to: email,
			subject: `RSRVD Ticket: ${title}`,
			html: htmlContent,
		});
		console.log("✅ Email sent to", email);
		return true;
	} catch (error) {
		console.error("❌ Failed to send email:", error);
		return false;
	}
};
