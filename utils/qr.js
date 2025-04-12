import QRCode from "qrcode";

export const generateQRCode = async (passcode) => {
  const token = JSON.stringify({ passcode, timestamp: Date.now() });
  return await QRCode.toDataURL(token);
};
