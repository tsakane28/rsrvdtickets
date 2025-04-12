import nodemailer from "nodemailer";

// Use environment variables for sensitive information
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // Use true if connecting to port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email to the recipient with event details.
 * @param {Object} params - The parameters for the email.
 * @param {string} params.name - The recipient's name.
 * @param {string} params.email - The recipient's email address.
 * @param {string} params.title - The event title.
 * @param {string} params.time - The event time.
 * @param {string} params.date - The event date.
 * @param {string} params.note - Additional notes.
 * @param {string} params.description - Event description.
 * @param {string} params.passcode - Event passcode.
 * @param {string} [params.flier_url] - URL of the event flier (optional).
 * @param {string} [params.qrCode] - Base64 QR code (optional).
 * @returns {Promise<boolean>} - Returns true if the email was sent successfully, false otherwise.
 */
export const sendEmail = async ({
  name,
  email,
  title,
  time,
  date,
  note,
  description,
  passcode,
  flier_url = "No flier for this event", // Default to no flier if not provided
  qrCode = null, // Optional base64 QR code
}) => {
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
