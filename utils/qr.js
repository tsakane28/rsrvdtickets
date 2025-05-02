import QRCode from "qrcode";
import crypto from "crypto";

/**
 * Generates a QR code that links to a verification page with the ticket ID
 * This enables security verification when the QR code is scanned
 * Includes a cryptographic signature to prevent tampering
 * 
 * @param {string} ticketId - The unique ID/passcode for the ticket
 * @param {string} eventId - Optional event ID for additional security
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
export const generateQRCode = async (ticketId, eventId = null) => {
  try {
    // Get the signature key, either from environment or from config
    const signatureKey = process.env.QR_SIGNATURE_KEY;
    
    if (!signatureKey) {
      console.error("QR_SIGNATURE_KEY not found in environment variables");
      throw new Error("Missing security configuration");
    }
    
    // Create verification URL base with ticket ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rsrvdtickets.vercel.app';
    let verificationUrl = `${baseUrl}/verify/${ticketId}`;
    
    // Add event ID as a parameter if provided
    if (eventId) {
      verificationUrl += `?eventId=${eventId}`;
    }
    
    // Add timestamp to prevent replay attacks
    const timestamp = Date.now();
    verificationUrl += `${verificationUrl.includes('?') ? '&' : '?'}ts=${timestamp}`;
    
    // Generate cryptographic signature for security
    // This will be verified server-side
    const dataToSign = `${ticketId}:${eventId || ''}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', signatureKey)
      .update(dataToSign)
      .digest('hex');
      
    // Add signature to URL
    verificationUrl += `&sig=${signature}`;
    
    // Generate QR code with the verification URL
    const qrCode = await QRCode.toDataURL(verificationUrl);
    
    console.log(`Generated secure QR code for ticket: ${ticketId}`);
    return qrCode;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};
