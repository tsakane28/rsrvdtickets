import QRCode from "qrcode";

export const generateQRCode = async (text) => {
  try {
    const qrCode = await QRCode.toDataURL(text);
    return qrCode;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};
