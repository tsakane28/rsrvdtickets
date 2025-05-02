import { ticketRateLimiter } from '../../../middleware/rateLimit';
import crypto from 'crypto';

// Secret key for CAPTCHA token decryption
const CAPTCHA_SECRET = process.env.SESSION_SECRET || '8c14a5c7bc4dc7b624df94f93effa546';

/**
 * Verify the puzzle CAPTCHA solution
 */
const handler = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

    // Get token and position from request
    const { token, position } = req.body;

    // Validate inputs
    if (!token || !position) {
      return res.status(400).json({
        success: false,
        message: 'Missing token or position'
      });
    }

    // Decrypt the token to get the expected position
    const decryptedData = decryptPuzzleToken(token);

    // If token decryption failed
    if (!decryptedData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CAPTCHA token'
      });
    }

    // Check if the token has expired
    if (decryptedData.expires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA has expired, please try again'
      });
    }

    // Compare the user's position with the expected position
    const expectedPosition = decryptedData.position;
    const tolerance = 15; // Same tolerance as defined in the generation endpoint

    const isCorrect =
      Math.abs(position.x - expectedPosition.x) <= tolerance &&
      Math.abs(position.y - expectedPosition.y) <= tolerance;

    if (isCorrect) {
      return res.status(200).json({
        success: true,
        message: 'CAPTCHA verification successful'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Incorrect puzzle solution'
      });
    }
  } catch (error) {
    console.error('Error verifying puzzle CAPTCHA:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying CAPTCHA'
    });
  }
};

/**
 * Decrypt a puzzle token to get the original solution data
 * @param {string} token - The encrypted token
 * @returns {Object|null} - The decrypted data or null if invalid
 */
function decryptPuzzleToken(token) {
  try {
    // Split the token into IV and encrypted data
    const [ivString, encrypted] = token.split(':');

    if (!ivString || !encrypted) {
      console.error('Invalid token format');
      return null;
    }

    // Convert the IV back to a Buffer
    const iv = Buffer.from(ivString, 'base64');

    // Create the decipher with the same key and IV
    const key = crypto.createHash('sha256').update(CAPTCHA_SECRET).digest('base64').substring(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Parse the decrypted JSON
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting puzzle token:', error);
    return null;
  }
}

export default ticketRateLimiter(handler); 