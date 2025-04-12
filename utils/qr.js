// utils/qr.js
import QRCode from "qrcode";

/**
 * Generates a QR code as a base64-encoded string.
 * @param {string} text - The text to encode in the QR code.
 * @returns {Promise<string>} - A promise that resolves to the base64-encoded QR code string.
 */
export const generateQRCode = async (text) => {
  try {
    // Generate the QR code as a base64 string
    const qrCode = await QRCode.toDataURL(text);
    return qrCode;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};
