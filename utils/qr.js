import QRCode from "qrcode";

/**
 * Generates a QR code that links to a verification page with the ticket ID
 * This enables security verification when the QR code is scanned
 * 
 * @param {string} ticketId - The unique ID/passcode for the ticket
 * @param {string} eventId - Optional event ID for additional security
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
export const generateQRCode = async (ticketId, eventId = null) => {
  try {
    // Create verification URL with ticket ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rsrvdtickets.vercel.app';
    let verificationUrl = `${baseUrl}/verify/${ticketId}`;
    
    // Add event ID as a parameter if provided
    if (eventId) {
      verificationUrl += `?eventId=${eventId}`;
    }
    
    // Generate QR code with the verification URL
    const qrCode = await QRCode.toDataURL(verificationUrl);
    return qrCode;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};
